'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, BriefcaseBusiness, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react'
import {
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  adminInputClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminPrimitives'
import AppShell from '@/components/layout/AppShell'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { PLAN_LIMITS, getWorkspacePlan, getWorkspaceUsageCount, type WorkspacePlan, type UsageFeature } from '@/lib/saas'
import { createClient } from '@/utils/supabase/client'

type ProfileSettingsRow = {
  full_name: string | null
}

type WorkspaceSettingsRow = {
  id: string
  name: string | null
  website: string | null
  tagline: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function formatDate(value: string | undefined) {
  if (!value) return 'No recent sign-in data'
  return new Date(value).toLocaleString()
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default function AdminSettingsPage() {
  const supabase = createClient()
  const { user, role, workspace, loading: authLoading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyTagline, setCompanyTagline] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [openingBilling, setOpeningBilling] = useState(false)
  const [plan, setPlan] = useState<WorkspacePlan>('starter')
  const [usage, setUsage] = useState<Record<UsageFeature, number>>({
    jobs: 0,
    candidates: 0,
    members: 0,
    aiScreenings: 0,
  })
  const [toast, setToast] = useState<ToastState>({ open: false })

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      if (authLoading || !user?.id) return

      const metadataFullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
      if (active) {
        setFullName(metadataFullName)
        setCompanyName(workspace?.name ?? '')
        setCompanyWebsite(workspace?.website ?? '')
        setCompanyTagline(workspace?.tagline ?? '')
      }

      const [profileRes, workspaceRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle(),
        workspace?.id
          ? supabase
              .from('workspaces')
              .select('id,name,website,tagline')
              .eq('id', workspace.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (!active) return

      if (profileRes.error) {
        setToast({ open: true, type: 'error', message: getErrorMessage(profileRes.error) })
        return
      }

      if (workspaceRes.error) {
        setToast({ open: true, type: 'error', message: getErrorMessage(workspaceRes.error) })
        return
      }

      const profile = (profileRes.data ?? null) as ProfileSettingsRow | null
      const workspaceRow = (workspaceRes.data ?? null) as WorkspaceSettingsRow | null

      setFullName((previous) => previous || profile?.full_name || '')
      setCompanyName(workspaceRow?.name ?? '')
      setCompanyWebsite(workspaceRow?.website ?? '')
      setCompanyTagline(workspaceRow?.tagline ?? '')
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [authLoading, supabase, user, workspace])

  useEffect(() => {
    let active = true

    const loadUsage = async () => {
      if (authLoading || !workspace?.id) return

      const [workspacePlan, jobs, candidates, members, aiScreenings] = await Promise.all([
        getWorkspacePlan(supabase, workspace.id),
        getWorkspaceUsageCount(supabase, workspace.id, 'jobs'),
        getWorkspaceUsageCount(supabase, workspace.id, 'candidates'),
        getWorkspaceUsageCount(supabase, workspace.id, 'members'),
        getWorkspaceUsageCount(supabase, workspace.id, 'aiScreenings'),
      ])

      if (!active) return

      setPlan(workspacePlan)
      setUsage({ jobs, candidates, members, aiScreenings })
    }

    void loadUsage()

    return () => {
      active = false
    }
  }, [authLoading, supabase, workspace])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()

    setSaving(true)

    try {
      const trimmedFullName = fullName.trim()
      const trimmedCompanyName = companyName.trim()
      const trimmedCompanyWebsite = normalizeWebsite(companyWebsite)
      const trimmedCompanyTagline = companyTagline.trim()

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedFullName,
        },
      })

      if (authError) throw authError

      if (!user?.id) {
        throw new Error('User session not found.')
      }

      const [profileResult, workspaceResult] = await Promise.all([
        supabase.from('profiles').upsert({
          id: user.id,
          full_name: trimmedFullName || null,
        }),
        workspace?.id
          ? supabase
              .from('workspaces')
              .update({
                name: trimmedCompanyName || 'HireSync workspace',
                website: trimmedCompanyWebsite || null,
                tagline: trimmedCompanyTagline || null,
              })
              .eq('id', workspace.id)
          : Promise.resolve({ error: null }),
      ])

      if (profileResult.error) throw profileResult.error
      if (workspaceResult.error) throw workspaceResult.error

      setToast({ open: true, type: 'success', message: 'Workspace profile updated successfully.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const sendResetEmail = async () => {
    if (!user?.email) return

    setSendingReset(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setToast({ open: true, type: 'success', message: 'Password reset email sent.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setSendingReset(false)
    }
  }

  const openBillingCheckout = async (nextPlan: 'pro' | 'business') => {
    setOpeningBilling(true)

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      })

      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Could not open billing checkout.')
      }

      window.location.href = payload.url
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setOpeningBilling(false)
    }
  }

  const userRole = role ?? 'admin'
  const setupCards = [
    {
      title: 'Owner name',
      ready: fullName.trim().length > 0,
      description: fullName.trim().length > 0 ? fullName.trim() : 'Add the person behind this workspace.',
    },
    {
      title: 'Company name',
      ready: companyName.trim().length > 0,
      description: companyName.trim().length > 0 ? companyName.trim() : 'Set the company name candidates will see.',
    },
    {
      title: 'Public context',
      ready: companyWebsite.trim().length > 0 || companyTagline.trim().length > 0,
      description:
        companyWebsite.trim().length > 0 || companyTagline.trim().length > 0
          ? companyWebsite.trim() || companyTagline.trim()
          : 'Add a website or tagline so the public portal feels credible.',
    },
  ]

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Settings"
        title="Account, company, and security"
        description="Keep the hiring workspace credible: clear owner identity, clear company profile, and secure account recovery."
        actions={
          <Link href="/" className={adminSecondaryButtonClassName}>
            Public portal
            <ArrowUpRight size={16} />
          </Link>
        }
        />

      <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {setupCards.map((card) => (
            <div key={card.title} className="border-l-2 border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-slate-950">{card.title}</div>
                <AdminPill label={card.ready ? 'Ready' : 'Needed'} tone={card.ready ? 'success' : 'warning'} />
              </div>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{card.description}</div>
            </div>
          ))}
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <AdminSectionCard
          eyebrow="Account"
          title="Profile and company details"
          description="Keep both the hiring owner and the company identity current so candidates understand who is hiring."
        >
          {authLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Workspace account
                    </div>
                    <div className="mt-2 text-lg font-black text-slate-950">{fullName || 'Unnamed admin'}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{user?.email || 'No email'}</div>
                    <div className="mt-3 text-sm font-semibold text-slate-500">
                      {workspace?.name || companyName || 'Company profile not configured yet'}
                    </div>
                  </div>
                  <AdminPill label={userRole} tone="accent" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Full name</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Hiring team owner"
                  className={`mt-2 ${adminInputClassName}`}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Email</label>
                <div className="mt-2 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  {user?.email || 'No email'}
                </div>
              </div>

              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-[10px] bg-white p-3 text-slate-900 shadow-sm">
                    <BriefcaseBusiness size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">Company profile</div>
                    <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                      These fields make the public jobs page look like a real company page instead of an empty demo.
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Company name
                    </label>
                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="HireSync Studio"
                      className={`mt-2 ${adminInputClassName}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Company website
                    </label>
                    <input
                      value={companyWebsite}
                      onChange={(event) => setCompanyWebsite(event.target.value)}
                      placeholder="https://example.com"
                      className={`mt-2 ${adminInputClassName}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Careers tagline
                    </label>
                    <input
                      value={companyTagline}
                      onChange={(event) => setCompanyTagline(event.target.value)}
                      placeholder="Building thoughtful software with a small, focused team."
                      className={`mt-2 ${adminInputClassName}`}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
        </AdminSectionCard>

        <div className="space-y-5">
          <AdminSectionCard
            eyebrow="Plan"
            title="Plan and usage"
            description="Keep workspace usage visible before billing is connected to Stripe."
          >
            <div className="space-y-3">
              <StatusRow icon={BriefcaseBusiness} label="Current plan" value={plan} />
              <UsageRow label="Jobs" value={usage.jobs} limit={PLAN_LIMITS[plan].jobs} />
              <UsageRow label="Candidates" value={usage.candidates} limit={PLAN_LIMITS[plan].candidates} />
              <UsageRow label="Team seats" value={usage.members} limit={PLAN_LIMITS[plan].members} />
              <UsageRow label="AI screenings" value={usage.aiScreenings} limit={PLAN_LIMITS[plan].aiScreenings} />
              <button
                type="button"
                onClick={() => openBillingCheckout('pro')}
                disabled={openingBilling || plan !== 'starter'}
                className={`w-full disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
              >
                {openingBilling ? 'Opening checkout...' : plan === 'starter' ? 'Upgrade to Pro' : 'Plan active'}
              </button>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            eyebrow="Security"
            title="Password reset"
            description="Use the secure reset flow when you want to rotate or recover the password for this account."
          >
            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-[10px] bg-white p-3 text-slate-900 shadow-sm">
                  <KeyRound size={18} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-950">Send reset email</div>
                  <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">
                    The link will be sent to the current account email and will redirect back into your secure reset flow.
                  </div>
                </div>
              </div>

              <button
                onClick={sendResetEmail}
                disabled={sendingReset || !user?.email}
                className={`mt-5 disabled:cursor-not-allowed disabled:opacity-50 ${adminSecondaryButtonClassName}`}
              >
                <Mail size={16} />
                {sendingReset ? 'Sending...' : 'Send reset email'}
              </button>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            eyebrow="Access"
            title="Account status"
            description="A concise summary of the current workspace account."
          >
            {authLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <div className="space-y-3">
                <StatusRow
                  icon={UserRound}
                  label="Role"
                  value={userRole === 'candidate' ? 'Candidate account' : 'Admin workspace access'}
                />
                <StatusRow icon={BriefcaseBusiness} label="Workspace" value={workspace?.name || 'Workspace not loaded yet'} />
                <StatusRow icon={ShieldCheck} label="Route protection" value="Protected routes are active for admin pages" />
                <StatusRow icon={Mail} label="Last sign in" value={formatDate(user?.last_sign_in_at)} />
              </div>
            )}
          </AdminSectionCard>
        </div>
      </section>
    </AppShell>
  )
}

function StatusRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound
  label: string
  value: string
}) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-[10px] bg-white p-2.5 text-slate-900 shadow-sm">
          <Icon size={16} />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{value}</div>
        </div>
      </div>
    </div>
  )
}

function UsageRow({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percentage = Math.min((value / limit) * 100, 100)

  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-1 text-sm font-black text-slate-700">
            {value} of {limit}
          </div>
        </div>
        <div className="min-w-[90px] text-right text-xs font-black text-slate-500">{Math.round(percentage)}%</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-slate-950" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
