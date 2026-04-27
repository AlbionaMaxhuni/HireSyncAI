import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { checkWorkspaceCapacity, recordAuditLog, recordUsageEvent } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { JobStatus } from '@/lib/hiring'

export const runtime = 'nodejs'

function validStatus(value: unknown): JobStatus {
  if (value === 'published' || value === 'archived') return value
  return 'draft'
}

export async function POST(req: Request) {
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'jobs:create', user.id), {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many job changes. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string
    description?: string
    status?: string
  } | null

  const title = String(body?.title ?? '').trim()
  const description = String(body?.description ?? '').trim()
  const status = validStatus(body?.status)

  if (title.length < 3) {
    return NextResponse.json({ error: 'Role title must be at least 3 characters.' }, { status: 400 })
  }

  if (description.length < 30) {
    return NextResponse.json({ error: 'Role brief must be at least 30 characters.' }, { status: 400 })
  }

  const capacity = await checkWorkspaceCapacity({
    supabase,
    workspaceId: workspace.id,
    feature: 'jobs',
  })

  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message }, { status: 402 })
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      workspace_id: workspace.id,
      title,
      description,
      status,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordUsageEvent(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'jobs',
    metadata: { jobId: data.id, status },
  })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'job.created',
    targetType: 'job',
    targetId: data.id,
    metadata: { title, status },
  })

  return NextResponse.json({ job: data })
}
