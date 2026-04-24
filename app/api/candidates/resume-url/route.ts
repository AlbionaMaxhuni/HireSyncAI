import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  const body = (await req.json().catch(() => null)) as { candidateId?: string } | null
  const candidateId = String(body?.candidateId ?? '').trim()

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId is required' }, { status: 400 })
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('resume_file_path')
    .eq('id', candidateId)
    .maybeSingle()

  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 })
  }

  if (!candidate?.resume_file_path) {
    return NextResponse.json({ error: 'Resume file not available for this candidate.' }, { status: 404 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.storage
    .from('resumes')
    .createSignedUrl(candidate.resume_file_path, 60)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
