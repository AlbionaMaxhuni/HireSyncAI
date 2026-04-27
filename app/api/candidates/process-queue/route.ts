import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processCandidateBatch } from '@/lib/candidate-processing'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { checkWorkspaceCapacity, recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requestLimit = checkRateLimit(rateLimitKey(req, 'ai:process-queue', user.id), {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })

  if (!requestLimit.ok) {
    return NextResponse.json(
      { error: 'Too many queue processing requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(requestLimit) }
    )
  }

  const body = (await req.json().catch(() => null)) as { jobId?: string; limit?: number } | null
  const jobId = String(body?.jobId ?? '')
  const limit = Math.max(1, Math.min(10, Number(body?.limit ?? 5)))

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const { data: job, error: jobError } = await supabase.from('jobs').select('*').eq('id', jobId).single()
  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Job not found' }, { status: 404 })
  }

  const { data: queued, error: queuedError } = await supabase
    .from('candidates')
    .select('*')
    .eq('job_id', jobId)
    .eq('processing_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (queuedError) {
    return NextResponse.json({ error: queuedError.message }, { status: 500 })
  }

  if (!queued?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const capacity = await checkWorkspaceCapacity({
    supabase: supabaseAdmin,
    workspaceId: job.workspace_id,
    feature: 'aiScreenings',
    increment: queued.length,
  })

  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message }, { status: 402 })
  }

  const result = await processCandidateBatch({
    supabaseAdmin,
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
    },
    candidates: queued.map((candidate) => ({
      id: candidate.id,
      resume_file_path: candidate.resume_file_path,
      source_filename: candidate.source_filename,
      workspace_id: candidate.workspace_id,
    })),
  })

  await recordAuditLog(supabaseAdmin, {
    workspaceId: job.workspace_id,
    actorUserId: user.id,
    action: 'candidate.queue_processed',
    targetType: 'job',
    targetId: job.id,
    metadata: {
      processed: result.processed,
      failed: result.failed.length,
    },
  })

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    failed: result.failed.length,
  })
}
