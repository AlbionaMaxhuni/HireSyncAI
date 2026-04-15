import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const cookieStore = await cookies()
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const jobId = String(body?.jobId ?? '')
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const { data: failedRows, error: failedError } = await supabase
    .from('candidates')
    .select('id')
    .eq('job_id', jobId)
    .eq('processing_status', 'failed')

  if (failedError) return NextResponse.json({ error: failedError.message }, { status: 500 })

  const failedIds = (failedRows ?? []).map((row) => row.id as string)
  if (failedIds.length === 0) {
    return NextResponse.json({ ok: true, retried: 0 })
  }

  const { error: updateError } = await supabase
    .from('candidates')
    .update({
      processing_status: 'queued',
      processing_error: null,
    })
    .in('id', failedIds)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, retried: failedIds.length })
}
