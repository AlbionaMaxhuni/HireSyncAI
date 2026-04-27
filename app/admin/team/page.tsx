'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, Copy, Loader2, Mail, Trash2, UserPlus } from 'lucide-react'
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  adminDangerButtonClassName,
  adminInputClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSelectClassName,
} from '@/components/admin/AdminPrimitives'
import AppShell from '@/components/layout/AppShell'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { buildMailtoHref, buildWorkspaceInviteEmail } from '@/lib/communications'
import { formatWorkspaceRole, type WorkspaceInviteRecord, type WorkspaceMemberRecord } from '@/lib/workspace'
import { createClient } from '@/utils/supabase/client'

type MemberProfile = {
  id: string
  full_name: string | null
}

type MemberView = WorkspaceMemberRecord & {
  full_name: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function isEmailDeliveryConfigError(value: string | null | undefined) {
  if (!value) return false

  return (
    value.includes('RESEND_') ||
    value.includes('EMAIL_FROM') ||
    value.includes('Email delivery is not configured') ||
    value.includes('Email sending is not configured')
  )
}

function SummaryItem({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{hint}</div>
    </div>
  )
}

function getInviteSendErrorMessage(value: string | null | undefined) {
  if (!value) return ''

  if (isEmailDeliveryConfigError(value)) {
    return ''
  }

  return value
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString()
}

export default function AdminTeamPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const { user, workspace, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<MemberView[]>([])
  const [invites, setInvites] = useState<WorkspaceInviteRecord[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'recruiter'>('recruiter')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [removingInviteId, setRemovingInviteId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false })

  useEffect(() => {
    const joinedMessage = searchParams.get('message')
    if (joinedMessage === 'invite_accepted') {
      setToast({ open: true, type: 'success', message: 'Workspace invite accepted successfully.' })
    }
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      if (authLoading) return
      if (!workspace?.id) {
        setLoading(false)
        setMembers([])
        setInvites([])
        return
      }

      setLoading(true)

      try {
        const [membersRes, invitesRes] = await Promise.all([
          supabase
            .from('workspace_members')
            .select('*')
            .eq('workspace_id', workspace.id)
            .eq('status', 'active')
            .order('created_at', { ascending: true }),
          supabase
            .from('workspace_invites')
            .select('*')
            .eq('workspace_id', workspace.id)
            .is('accepted_at', null)
            .order('created_at', { ascending: false }),
        ])

        if (membersRes.error) throw membersRes.error
        if (invitesRes.error) throw invitesRes.error

        const memberRows = (membersRes.data ?? []) as WorkspaceMemberRecord[]
        const inviteRows = (invitesRes.data ?? []) as WorkspaceInviteRecord[]

        const userIds = Array.from(new Set(memberRows.map((member) => member.user_id)))
        let profilesById: Record<string, MemberProfile> = {}

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id,full_name')
            .in('id', userIds)

          if (profilesError) throw profilesError

          profilesById = ((profilesData ?? []) as MemberProfile[]).reduce<Record<string, MemberProfile>>(
            (accumulator, profile) => {
              accumulator[profile.id] = profile
              return accumulator
            },
            {}
          )
        }

        setMembers(
          memberRows.map((member) => ({
            ...member,
            full_name: profilesById[member.user_id]?.full_name ?? null,
          }))
        )
        setInvites(inviteRows)
      } catch (error: unknown) {
        setToast({ open: true, type: 'error', message: getErrorMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [authLoading, supabase, workspace])

  const canCreateInvite = inviteEmail.trim().length > 4 && Boolean(workspace?.id) && Boolean(user?.id)
  const inviteLinkBuilder = useMemo(
    () => (inviteCode: string) => {
      const nextPath = encodeURIComponent(`/auth/complete?invite=${inviteCode}`)
      return `${window.location.origin}/login?next=${nextPath}`
    },
    []
  )

  const buildInviteDraft = (invite: WorkspaceInviteRecord) => {
    const inviteLink = typeof window === 'undefined' ? '' : inviteLinkBuilder(invite.invite_code)

    return buildWorkspaceInviteEmail({
      workspaceName: workspace?.name || 'HireSync workspace',
      inviteLink,
      inviterName: user?.email || workspace?.name || 'HireSync workspace',
    })
  }

  const getInviteMailto = (invite: WorkspaceInviteRecord) => {
    const draft = buildInviteDraft(invite)
    return buildMailtoHref(invite.email, draft.subject, draft.body)
  }

  const openInviteEmailDraft = (invite: WorkspaceInviteRecord) => {
    if (typeof window === 'undefined') return
    window.location.href = getInviteMailto(invite)
  }

  const copyInviteLink = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteLinkBuilder(inviteCode))
      setToast({ open: true, type: 'success', message: 'Invite link copied.' })
    } catch {
      setToast({ open: true, type: 'error', message: 'Could not copy invite link.' })
    }
  }

  const createInvite = async (event: FormEvent) => {
    event.preventDefault()

    if (!canCreateInvite || !workspace?.id || !user?.id) return

    setCreatingInvite(true)

    try {
      const response = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        invite?: WorkspaceInviteRecord
        error?: string
      } | null

      if (!response.ok || !payload?.invite) {
        throw new Error(payload?.error ?? 'Could not create invite.')
      }

      setInvites((previous) => [payload.invite as WorkspaceInviteRecord, ...previous])
      setInviteEmail('')
      setToast({
        open: true,
        type: 'success',
        message: 'Invite created. Send the email or copy the invite link from the access list.',
      })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setCreatingInvite(false)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    setRemovingInviteId(inviteId)

    try {
      const response = await fetch(`/api/workspace/invites/${inviteId}`, {
        method: 'DELETE',
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Could not cancel invite.')
      }

      setInvites((previous) => previous.filter((invite) => invite.id !== inviteId))
      setToast({ open: true, type: 'success', message: 'Invite revoked.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setRemovingInviteId(null)
    }
  }

  const sendInviteEmail = async (invite: WorkspaceInviteRecord) => {
    setSendingInviteId(invite.id)

    try {
      const response = await fetch('/api/communications/workspace-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: invite.id }),
      })

      const payload = (await response.json().catch(() => null)) as {
        error?: string
        invite?: WorkspaceInviteRecord
      } | null

      if (payload?.invite) {
        setInvites((previous) =>
          previous.map((existingInvite) =>
            existingInvite.id === payload.invite?.id ? (payload.invite as WorkspaceInviteRecord) : existingInvite
          )
        )
      }

      if (!response.ok) {
        const errorMessage = payload?.error ?? 'Could not send workspace invite.'

        if (isEmailDeliveryConfigError(errorMessage)) {
          openInviteEmailDraft(payload?.invite ?? invite)
          setToast({
            open: true,
            type: 'success',
            message: 'Email draft opened. Send it from your email client to share the invite.',
          })
          return
        }

        throw new Error(errorMessage)
      }

      setToast({ open: true, type: 'success', message: 'Workspace invite email sent successfully.' })
    } catch (error: unknown) {
      setToast({
        open: true,
        type: 'error',
        message: getInviteSendErrorMessage(getErrorMessage(error)) || 'Could not send workspace invite.',
      })
    } finally {
      setSendingInviteId(null)
    }
  }

  const removeMember = async (member: MemberView) => {
    if (member.role === 'owner') {
      setToast({ open: true, type: 'error', message: 'The workspace owner cannot be removed here.' })
      return
    }

    if (member.user_id === user?.id) {
      setToast({ open: true, type: 'error', message: 'You cannot remove your own access from here.' })
      return
    }

    const confirmed = confirm(`Remove ${member.email || member.full_name || 'this member'} from the workspace?`)
    if (!confirmed) return

    setRemovingMemberId(member.id)

    try {
      const { error } = await supabase.from('workspace_members').delete().eq('id', member.id)
      if (error) throw error

      setMembers((previous) => previous.filter((item) => item.id !== member.id))
      setToast({ open: true, type: 'success', message: 'Team member removed.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setRemovingMemberId(null)
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Team"
        title="Workspace access"
        description="Invite teammates into the same hiring workspace, keep access visible, and share a cleaner admin flow with real companies."
        actions={
          <>
            <Link href="/admin/settings" className={adminSecondaryButtonClassName}>
              Settings
            </Link>
            <Link href="/jobs" className={adminSecondaryButtonClassName}>
              Public portal
              <ArrowUpRight size={16} />
            </Link>
          </>
        }
      />

      <section className="mt-5 border-y border-slate-200 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : (
            <>
              <SummaryItem label="Workspace" value={workspace?.name || 'Workspace'} hint="Current hiring team" />
              <SummaryItem label="Active members" value={String(members.length)} hint="People with access" />
              <SummaryItem label="Pending invites" value={String(invites.length)} hint="Waiting to join" />
            </>
          )}
        </div>
      </section>

      <AdminSectionCard
        eyebrow="Invite"
        title="Invite teammate"
        description="Add the email address, create the invite, then send it from the access list."
        className="mt-5"
      >
        {authLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <form onSubmit={createInvite} className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Teammate email</label>
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="recruiter@company.com"
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Role</label>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'recruiter')}
                className={`mt-2 w-full ${adminSelectClassName}`}
              >
                <option value="recruiter">Recruiter</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={creatingInvite || !canCreateInvite}
                className={`w-full disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
              >
                {creatingInvite ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {creatingInvite ? 'Creating...' : 'Create invite'}
              </button>
            </div>
          </form>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Access"
        title="Members and invites"
        description="Active teammates and pending invite links stay in one clean list."
        className="mt-5"
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : members.length === 0 && invites.length === 0 ? (
          <AdminEmptyState
            title="No access records yet"
            description="Create the first invite to turn this into a shared hiring workspace."
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {['Person', 'Role', 'Status', 'Date', 'Actions'].map((header) => (
                    <th key={header} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="max-w-[360px] px-5 py-4">
                      <div className="truncate text-sm font-black text-slate-950">
                        {member.full_name || member.email || 'Unnamed team member'}
                      </div>
                      <div className="mt-1 truncate text-xs font-semibold text-slate-500">{member.email || 'No email stored'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <AdminPill label={formatWorkspaceRole(member.role)} tone={member.role === 'owner' ? 'success' : 'accent'} />
                    </td>
                    <td className="px-5 py-4">
                      <AdminPill label="Active" tone="success" />
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-500">Joined {formatDate(member.joined_at)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={removingMemberId === member.id || member.role === 'owner' || member.user_id === user?.id}
                        className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminDangerButtonClassName}`}
                      >
                        <Trash2 size={16} />
                        {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}

                {invites.map((invite) => {
                  const inviteSendError = getInviteSendErrorMessage(invite.last_send_error)

                  return (
                    <tr key={invite.id} className="hover:bg-slate-50">
                      <td className="max-w-[360px] px-5 py-4">
                        <div className="truncate text-sm font-black text-slate-950">{invite.email}</div>
                        {inviteSendError ? (
                          <div className="mt-1 text-xs font-semibold text-amber-700">{inviteSendError}</div>
                        ) : invite.last_sent_at ? (
                          <div className="mt-1 text-xs font-semibold text-emerald-700">Last sent {formatDate(invite.last_sent_at)}</div>
                        ) : (
                          <div className="mt-1 text-xs font-semibold text-slate-500">Invite link ready</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <AdminPill label={formatWorkspaceRole(invite.role)} tone="accent" />
                      </td>
                      <td className="px-5 py-4">
                        <AdminPill label="Pending" tone="warning" />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-500">Expires {formatDate(invite.expires_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => sendInviteEmail(invite)}
                            disabled={sendingInviteId === invite.id}
                            className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
                          >
                            {sendingInviteId === invite.id ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                            {sendingInviteId === invite.id ? 'Sending...' : 'Send email'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyInviteLink(invite.invite_code)}
                            className={adminSecondaryButtonClassName}
                          >
                            <Copy size={16} />
                            Copy link
                          </button>
                          <button
                            type="button"
                            onClick={() => revokeInvite(invite.id)}
                            disabled={removingInviteId === invite.id}
                            className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminDangerButtonClassName}`}
                          >
                            <Trash2 size={16} />
                            {removingInviteId === invite.id ? 'Canceling...' : 'Cancel'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </AppShell>
  )
}
