import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processCandidateBatch } from '@/lib/candidate-processing'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const form = await req.formData()
  const jobId = String(form.get('jobId') ?? '')
  const files = form.getAll('files') as File[]

  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

  const { data: job } = await supabase
    .from('jobs')
    .select('id,workspace_id,title,description,workspaces(name)')
    .eq('id', jobId)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const createdCandidateIds: string[] = []
  const errors: string[] = []
  const uploadedCandidates: Array<{
    id: string
    resume_file_path: string | null
    source_filename: string | null
  }> = []

  const companyName =
    job.workspaces && typeof job.workspaces === 'object' && 'name' in job.workspaces
      ? (job.workspaces.name as string | null) ?? null
      : null

  for (const file of files) {
    const name = file.name || 'resume'
    const lower = name.toLowerCase()
    const ok = lower.endsWith('.pdf') || lower.endsWith('.docx')
    if (!ok) {
      errors.push(`${name}: only PDF and DOCX files are supported.`)
      continue
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${name}: file is larger than 5 MB.`)
      continue
    }

    const bytes = await file.arrayBuffer()
    const ts = Date.now()
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${jobId}/${ts}_${safeName}`

    // IMPORTANT: upload with admin client (no RLS issues)
    const upload = await supabaseAdmin.storage.from('resumes').upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: false,
    })

    if (upload.error) {
      return NextResponse.json(
        { error: `Storage upload failed for ${name}: ${upload.error.message}` },
        { status: 500 }
      )
    }

    const insert = await supabaseAdmin
      .from('candidates')
      .insert([
        {
          user_id: user.id,
          job_id: jobId,
          workspace_id: job.workspace_id ?? null,
          job_title_snapshot: job.title,
          company_name_snapshot: companyName,
          full_name: safeName.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim(),
          email: null,
          resume_text: '',
          resume_file_path: path,
          source_filename: name,
          processing_status: 'queued',
          processing_error: null,
          status: 'applied',
          skills: null,
          seniority: null,
          location: null,
          salary_expectation: null,
          availability: null,
          source: 'bulk-upload',
        },
      ])
      .select('id,resume_file_path,source_filename')
      .single()

    if (insert.error || !insert.data?.id) {
      await supabaseAdmin.storage.from('resumes').remove([path])
      errors.push(`${name}: ${insert.error?.message ?? 'candidate record could not be created.'}`)
      continue
    }

    createdCandidateIds.push(insert.data.id)
    uploadedCandidates.push({
      id: insert.data.id,
      resume_file_path: insert.data.resume_file_path ?? path,
      source_filename: insert.data.source_filename ?? name,
    })
  }

  if (createdCandidateIds.length === 0) {
    return NextResponse.json(
      {
        error: errors[0] ?? 'No candidate records were created from the uploaded files.',
        errors,
      },
      { status: 400 }
    )
  }

  let processed = 0
  const processingErrors: string[] = []

  if (process.env.OPENROUTER_API_KEY) {
    const processingResult = await processCandidateBatch({
      supabaseAdmin,
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
      },
      candidates: uploadedCandidates,
    })

    processed = processingResult.processed
    processingErrors.push(...processingResult.failed.map((item) => `Candidate ${item.candidateId}: ${item.error}`))
  }

  return NextResponse.json({
    ok: true,
    created: createdCandidateIds.length,
    processed,
    queued: createdCandidateIds.length - processed,
    candidateIds: createdCandidateIds,
    errors,
    processingErrors,
  })
}
