import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'workspace:member-delete', user.id), {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many team access changes. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('id,user_id,email,role,workspace_id')
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })
  if (!member) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'The workspace owner cannot be removed here.' }, { status: 400 })
  }
  if (member.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own access from here.' }, { status: 400 })
  }

  const { error } = await supabase.from('workspace_members').delete().eq('id', id).eq('workspace_id', workspace.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'workspace.member_removed',
    targetType: 'workspace_member',
    targetId: id,
    metadata: {
      removedUserId: member.user_id,
      removedEmail: member.email,
    },
  })

  return NextResponse.json({ ok: true })
}
