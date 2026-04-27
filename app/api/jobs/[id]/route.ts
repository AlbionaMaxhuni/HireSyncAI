import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { JobStatus } from '@/lib/hiring'

export const runtime = 'nodejs'

function validStatus(value: unknown): JobStatus | null {
  if (value === 'draft' || value === 'published' || value === 'archived') return value
  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'jobs:update', user.id), {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many job changes. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null
  const status = validStatus(body?.status)

  if (!status) return NextResponse.json({ error: 'Invalid job status.' }, { status: 400 })

  const { data, error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'job.status_updated',
    targetType: 'job',
    targetId: id,
    metadata: { status },
  })

  return NextResponse.json({ job: data })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'jobs:delete', user.id), {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many delete attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('workspace_id', workspace.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'job.deleted',
    targetType: 'job',
    targetId: id,
  })

  return NextResponse.json({ ok: true })
}
