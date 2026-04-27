import { NextResponse } from 'next/server'
import { buildWorkspaceInviteEmail } from '@/lib/communications'
import { isEmailDeliveryConfigured, sendTransactionalEmail } from '@/lib/email'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { WorkspaceInviteRecord } from '@/lib/workspace'

export const runtime = 'nodejs'

const emailDeliveryNotConfiguredMessage =
  'Email delivery is not configured. Use the email draft or copy link to send this invite manually.'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { inviteId?: string } | null
  const inviteId = String(body?.inviteId ?? '').trim()

  if (!inviteId) {
    return NextResponse.json({ error: 'inviteId is required.' }, { status: 400 })
  }

  const { data: invite, error: inviteError } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id,name')
    .eq('id', invite.workspace_id)
    .maybeSingle()

  if (workspaceError) {
    return NextResponse.json({ error: workspaceError.message }, { status: 500 })
  }

  const origin = new URL(req.url).origin
  const invitePath = `/auth/complete?invite=${invite.invite_code}`
  const inviteLink = `${origin}/login?next=${encodeURIComponent(invitePath)}`

  const draft = buildWorkspaceInviteEmail({
    workspaceName: workspace?.name || 'HireSync workspace',
    inviteLink,
    inviterName: user.email || workspace?.name || 'HireSync workspace',
  })

  if (!isEmailDeliveryConfigured()) {
    const { data: updatedInvite } = await supabase
      .from('workspace_invites')
      .update({
        last_send_error: emailDeliveryNotConfiguredMessage,
      })
      .eq('id', invite.id)
      .select('*')
      .single()

    return NextResponse.json(
      {
        error: emailDeliveryNotConfiguredMessage,
        invite: (updatedInvite as WorkspaceInviteRecord | null) ?? invite,
      },
      { status: 503 }
    )
  }

  try {
    const sent = await sendTransactionalEmail({
      to: invite.email,
      subject: draft.subject,
      text: draft.body,
    })

    const { data: updatedInvite, error: updateError } = await supabase
      .from('workspace_invites')
      .update({
        last_sent_at: new Date().toISOString(),
        last_email_id: sent.id,
        last_send_error: null,
      })
      .eq('id', invite.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      emailId: sent.id,
      invite: updatedInvite as WorkspaceInviteRecord,
    })
  } catch (error: unknown) {
    const safeErrorMessage = getErrorMessage(error).includes('RESEND_') || getErrorMessage(error).includes('EMAIL_FROM')
      ? emailDeliveryNotConfiguredMessage
      : getErrorMessage(error)

    const { data: updatedInvite } = await supabase
      .from('workspace_invites')
      .update({
        last_send_error: safeErrorMessage,
      })
      .eq('id', invite.id)
      .select('*')
      .single()

    return NextResponse.json(
      {
        error: safeErrorMessage,
        invite: (updatedInvite as WorkspaceInviteRecord | null) ?? invite,
      },
      { status: 500 }
    )
  }
}
