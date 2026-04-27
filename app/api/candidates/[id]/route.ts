import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { CandidateStage } from '@/lib/hiring'

export const runtime = 'nodejs'

function validStage(value: unknown): CandidateStage | null {
  if (
    value === 'applied' ||
    value === 'screening' ||
    value === 'interview' ||
    value === 'final' ||
    value === 'hired' ||
    value === 'rejected'
  ) {
    return value
  }

  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'candidates:update', user.id), {
    limit: 120,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many candidate updates. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null
  const status = validStage(body?.status)

  if (!status) return NextResponse.json({ error: 'Invalid candidate stage.' }, { status: 400 })

  const { data, error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .select('*, jobs(title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'candidate.stage_updated',
    targetType: 'candidate',
    targetId: id,
    metadata: { status },
  })

  return NextResponse.json({ candidate: data })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'candidates:delete', user.id), {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many delete attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const { error } = await supabase.from('candidates').delete().eq('id', id).eq('workspace_id', workspace.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'candidate.deleted',
    targetType: 'candidate',
    targetId: id,
  })

  return NextResponse.json({ ok: true })
}
