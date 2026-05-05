import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { checkWorkspaceCapacity, recordAuditLog } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import type { WorkspaceInviteRecord } from '@/lib/workspace'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'workspace:invite-create', user.id), {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many invite attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as { email?: string; role?: string } | null
  const email = normalizeEmail(String(body?.email ?? ''))
  const inviteRole = body?.role === 'recruiter' ? 'recruiter' : 'recruiter'

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid teammate email is required.' }, { status: 400 })
  }

  const [{ data: existingMember, error: existingMemberError }, { data: existingInvite, error: existingInviteError }] =
    await Promise.all([
      supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('workspace_invites')
        .select('id,expires_at')
        .eq('workspace_id', workspace.id)
        .eq('email', email)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
        .maybeSingle(),
    ])

  if (existingMemberError) return NextResponse.json({ error: existingMemberError.message }, { status: 500 })
  if (existingInviteError) return NextResponse.json({ error: existingInviteError.message }, { status: 500 })
  if (existingMember) {
    return NextResponse.json({ error: 'This teammate already has workspace access.' }, { status: 409 })
  }
  if (existingInvite && (!existingInvite.expires_at || new Date(existingInvite.expires_at).getTime() >= Date.now())) {
    return NextResponse.json({ error: 'A pending invite already exists for this email.' }, { status: 409 })
  }

  const capacity = await checkWorkspaceCapacity({
    supabase,
    workspaceId: workspace.id,
    feature: 'members',
  })

  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message }, { status: 402 })
  }

  const inviteCode = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: workspace.id,
      email,
      role: inviteRole,
      invite_code: inviteCode,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'workspace.invite_created',
    targetType: 'workspace_invite',
    targetId: data.id,
    metadata: {
      email,
      role: inviteRole,
    },
  })

  return NextResponse.json({ invite: data as WorkspaceInviteRecord })
}
