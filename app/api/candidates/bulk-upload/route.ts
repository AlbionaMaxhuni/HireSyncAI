import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const cookieStore = await cookies()

  // user client (RLS)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // admin client (bypass RLS for storage)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })

  const form = await req.formData()
  const jobId = String(form.get('jobId') ?? '')
  const files = form.getAll('files') as File[]

  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

  // verify job exists for this user (RLS will enforce too)
  const { data: job } = await supabase.from('jobs').select('id').eq('id', jobId).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const createdCandidateIds: string[] = []

  for (const file of files) {
    const name = file.name || 'resume'
    const lower = name.toLowerCase()
    const ok = lower.endsWith('.pdf') || lower.endsWith('.docx')
    if (!ok) continue

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

    const insert = await supabase
      .from('candidates')
      .insert([
        {
          user_id: user.id,
          job_id: jobId,
          full_name: safeName.replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ').trim(),
          email: null,
          resume_text: '',
          resume_file_path: path,
          source_filename: name,
          processing_status: 'queued',
          processing_error: null,
          status: 'new',
        },
      ])
      .select('id')
      .single()

    if (!insert.error && insert.data?.id) createdCandidateIds.push(insert.data.id)
  }

  return NextResponse.json({ ok: true, created: createdCandidateIds.length, candidateIds: createdCandidateIds })
}