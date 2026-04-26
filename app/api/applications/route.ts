import { NextResponse } from 'next/server'
import { getUserDisplayName } from '@/lib/auth'
import { isJobPublic } from '@/lib/hiring'
import { createServerSupabaseAdminClient, getOptionalServerUser } from '@/lib/server-auth'

export const runtime = 'nodejs'
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024

function getFileExtension(name: string) {
  const normalized = name.trim().toLowerCase()
  if (normalized.endsWith('.pdf')) return 'pdf'
  if (normalized.endsWith('.docx')) return 'docx'
  return null
}

export async function POST(req: Request) {
  const { user, supabase } = await getOptionalServerUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in before applying.' }, { status: 401 })
  }

  const form = await req.formData()
  const jobId = String(form.get('jobId') ?? '').trim()
  const email = String(form.get('email') ?? user.email ?? '').trim().toLowerCase()
  const fullName = String(form.get('fullName') ?? getUserDisplayName(user, '')).trim()
  const location = String(form.get('location') ?? '').trim()
  const note = String(form.get('note') ?? '').trim()
  const resume = form.get('resume')

  if (!jobId) {
    return NextResponse.json({ error: 'Job is required.' }, { status: 400 })
  }

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  if (!(resume instanceof File) || resume.size === 0) {
    return NextResponse.json({ error: 'Please upload your CV.' }, { status: 400 })
  }

  if (resume.size > MAX_RESUME_SIZE_BYTES) {
    return NextResponse.json({ error: 'CV file must be 5 MB or smaller.' }, { status: 400 })
  }

  const extension = getFileExtension(resume.name)
  if (!extension) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are supported.' }, { status: 400 })
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,title,status,workspace_id,workspaces(name)')
    .eq('id', jobId)
    .maybeSingle()
  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  if (!job) {
    return NextResponse.json({ error: 'This job is no longer available.' }, { status: 404 })
  }

  if (!isJobPublic(job)) {
    return NextResponse.json({ error: 'This role is not accepting public applications.' }, { status: 403 })
  }

  const duplicate = await supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .eq('source', 'career-site')

  if (!duplicate.error && (duplicate.count ?? 0) > 0) {
    return NextResponse.json({ error: 'You already applied for this role.' }, { status: 409 })
  }

  const supabaseAdmin = createServerSupabaseAdminClient()
  const safeName = resume.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${jobId}/applications/${Date.now()}_${safeName}`
  const bytes = await resume.arrayBuffer()

  const upload = await supabaseAdmin.storage.from('resumes').upload(path, bytes, {
    contentType: resume.type || undefined,
    upsert: false,
  })

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 })
  }

  const insert = await supabase
    .from('candidates')
    .insert([
      {
        user_id: user.id,
        job_id: jobId,
        workspace_id: job.workspace_id ?? null,
        job_title_snapshot: job.title,
        company_name_snapshot:
          typeof job.workspaces === 'object' && job.workspaces && 'name' in job.workspaces
            ? (job.workspaces.name as string | null)
            : null,
        full_name: fullName,
        email,
        resume_text: note,
        resume_file_path: path,
        source_filename: resume.name,
        processing_status: 'queued',
        processing_error: null,
        status: 'applied',
        location: location || null,
        source: 'career-site',
      },
    ])
    .select('id')
    .single()

  if (insert.error) {
    await supabaseAdmin.storage.from('resumes').remove([path]).catch(() => undefined)

    if (insert.error.code === '23505') {
      return NextResponse.json({ error: 'You already applied for this role.' }, { status: 409 })
    }

    return NextResponse.json({ error: insert.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    applicationId: insert.data.id,
    jobTitle: job.title,
  })
}
