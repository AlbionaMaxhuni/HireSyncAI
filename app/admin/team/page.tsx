'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, Copy, Loader2, Mail, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminStatCard,
  AdminStatsGrid,
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

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString()
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
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

  const copyInviteLink = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteLinkBuilder(inviteCode))
      setToast({ open: true, type: 'success', message: 'Invite link copied.' })
    } catch {
      setToast({ open: true, type: 'error', message: 'Could not copy invite link.' })
    }
  }

  const copyInviteMessage = async (invite: WorkspaceInviteRecord) => {
    try {
      const inviteLink = inviteLinkBuilder(invite.invite_code)
      const draft = buildWorkspaceInviteEmail({
        workspaceName: workspace?.name || 'HireSync workspace',
        inviteLink,
        inviterName: user?.email || workspace?.name || 'HireSync workspace',
      })

      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)
      setToast({ open: true, type: 'success', message: 'Invite email copied.' })
    } catch {
      setToast({ open: true, type: 'error', message: 'Could not copy invite email.' })
    }
  }

  const createInvite = async (event: FormEvent) => {
    event.preventDefault()

    if (!canCreateInvite || !workspace?.id || !user?.id) return

    setCreatingInvite(true)

    try {
      const inviteCode = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

      const { data, error } = await supabase
        .from('workspace_invites')
        .insert({
          workspace_id: workspace.id,
          email: normalizeEmail(inviteEmail),
          role: inviteRole,
          invite_code: inviteCode,
          invited_by: user.id,
          expires_at: expiresAt,
        })
        .select('*')
        .single()

      if (error) throw error

      const nextInvite = data as WorkspaceInviteRecord
      setInvites((previous) => [nextInvite, ...previous])
      setInviteEmail('')
      setToast({
        open: true,
        type: 'success',
        message: 'Invite created. Copy the link below and share it with your teammate.',
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
      const { error } = await supabase.from('workspace_invites').delete().eq('id', inviteId)
      if (error) throw error

      setInvites((previous) => previous.filter((invite) => invite.id !== inviteId))
      setToast({ open: true, type: 'success', message: 'Invite revoked.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setRemovingInviteId(null)
    }
  }

  const sendInviteEmail = async (inviteId: string) => {
    setSendingInviteId(inviteId)

    try {
      const response = await fetch('/api/communications/workspace-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })

      const payload = (await response.json().catch(() => null)) as {
        error?: string
        invite?: WorkspaceInviteRecord
      } | null

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Could not send workspace invite.')
      }

      if (payload?.invite) {
        setInvites((previous) =>
          previous.map((invite) => (invite.id === inviteId ? (payload.invite as WorkspaceInviteRecord) : invite))
        )
      }

      setToast({ open: true, type: 'success', message: 'Workspace invite email sent successfully.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
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

      <AdminStatsGrid>
        {loading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          <>
            <AdminStatCard label="Workspace" value={workspace?.name || 'Workspace'} hint="Current hiring team" icon={ShieldCheck} />
            <AdminStatCard label="Members" value={String(members.length)} hint="Active admins in this workspace" icon={Users} tone="accent" />
            <AdminStatCard label="Pending invites" value={String(invites.length)} hint="Invite links not accepted yet" icon={Mail} tone="warning" />
            <AdminStatCard label="Invite flow" value="Link-based" hint="Manual share until email delivery is connected" icon={UserPlus} tone="success" />
          </>
        )}
      </AdminStatsGrid>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminSectionCard
          eyebrow="Invite"
          title="Add a teammate"
          description="Create a secure invite link for a recruiter and share it manually. This keeps the app usable now, even before full email automation is connected."
        >
          {authLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : (
            <form onSubmit={createInvite} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Workspace</label>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  {workspace?.name || 'Workspace not available yet'}
                </div>
              </div>

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
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Access role</label>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as 'recruiter')}
                  className={`mt-2 ${adminSelectClassName}`}
                >
                  <option value="recruiter">Recruiter</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingInvite || !canCreateInvite}
                className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
              >
                <UserPlus size={16} />
                {creatingInvite ? 'Creating invite...' : 'Create invite'}
              </button>
            </form>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="People"
          title="Current workspace members"
          description="Everyone with active access to jobs, candidates, notes, and analytics in this workspace."
        >
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : members.length === 0 ? (
              <AdminEmptyState
                title="No members yet"
                description="Create the first invite to turn this into a shared hiring workspace."
              />
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-lg font-black text-slate-950">
                        {member.full_name || member.email || 'Unnamed team member'}
                      </div>
                      <AdminPill label={formatWorkspaceRole(member.role)} tone={member.role === 'owner' ? 'success' : 'accent'} />
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-500">{member.email || 'No email stored'}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Joined {formatDate(member.joined_at)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMember(member)}
                    disabled={removingMemberId === member.id || member.role === 'owner' || member.user_id === user?.id}
                    className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminDangerButtonClassName}`}
                  >
                    <Trash2 size={16} />
                    {removingMemberId === member.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))
            )}
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-6">
        <AdminSectionCard
          eyebrow="Pending"
          title="Open invite links"
          description="These links remain valid until they are accepted or revoked."
        >
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : invites.length === 0 ? (
              <AdminEmptyState
                title="No pending invites"
                description="When you create invite links, they will appear here with copy and revoke actions."
              />
            ) : (
              invites.map((invite) => {
                const inviteLink = typeof window === 'undefined' ? '' : inviteLinkBuilder(invite.invite_code)
                const inviteDraft = buildWorkspaceInviteEmail({
                  workspaceName: workspace?.name || 'HireSync workspace',
                  inviteLink,
                  inviterName: user?.email || workspace?.name || 'HireSync workspace',
                })
                const inviteMailto = buildMailtoHref(invite.email, inviteDraft.subject, inviteDraft.body)

                return (
                  <div key={invite.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black text-slate-950">{invite.email}</div>
                          <AdminPill label={formatWorkspaceRole(invite.role)} tone="accent" />
                        </div>
                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Expires {formatDate(invite.expires_at)}
                        </div>
                        {invite.last_sent_at ? (
                          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Last sent {formatDate(invite.last_sent_at)}
                          </div>
                        ) : null}
                        {invite.last_send_error ? (
                          <div className="mt-2 text-xs font-semibold text-rose-700">{invite.last_send_error}</div>
                        ) : null}
                        <div className="mt-4 break-all rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                          {inviteLink}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => sendInviteEmail(invite.id)}
                          disabled={sendingInviteId === invite.id}
                          className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
                        >
                          {sendingInviteId === invite.id ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                          {sendingInviteId === invite.id ? 'Sending...' : 'Send invite'}
                        </button>
                        <Link href={inviteMailto} className={adminSecondaryButtonClassName}>
                          <Mail size={16} />
                          Open email draft
                        </Link>
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
                          onClick={() => copyInviteMessage(invite)}
                          className={adminSecondaryButtonClassName}
                        >
                          <Copy size={16} />
                          Copy email
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite(invite.id)}
                          disabled={removingInviteId === invite.id}
                          className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminDangerButtonClassName}`}
                        >
                          <Trash2 size={16} />
                          {removingInviteId === invite.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </AdminSectionCard>
      </section>
    </AppShell>
  )
}
