'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, BadgeCheck, Briefcase, Building2, Clock3, Globe2, TrendingUp, Users } from 'lucide-react'
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminStatCard,
  AdminStatsGrid,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminPrimitives'
import AppShell from '@/components/layout/AppShell'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  PIPELINE_STAGES,
  type CandidateRecord,
  type JobRecord,
  getScoreLabel,
  getScoreTone,
  getJobStatusMeta,
  normalizeJobStatus,
  normalizeCandidateStage,
  safeArray,
} from '@/lib/hiring'

type NoteSummary = {
  id: string
  candidate_id: string
  created_at: string
}

type WorkspaceProfileSummary = {
  full_name: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const { user, workspace, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [profile, setProfile] = useState<WorkspaceProfileSummary | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false })

  useEffect(() => {
    const load = async () => {
      if (authLoading || !user) return

      setLoading(true)

      try {
        const [jobsRes, candidatesRes, notesRes, profileRes] = await Promise.all([
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
          supabase.from('candidates').select('*').order('created_at', { ascending: false }),
          supabase.from('candidate_notes').select('id,candidate_id,created_at').order('created_at', {
            ascending: false,
          }),
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        ])

        if (jobsRes.error) throw jobsRes.error
        if (candidatesRes.error) throw candidatesRes.error
        if (notesRes.error) throw notesRes.error
        if (profileRes.error) throw profileRes.error

        setJobs((jobsRes.data ?? []) as JobRecord[])
        setCandidates((candidatesRes.data ?? []) as CandidateRecord[])
        setNotes((notesRes.data ?? []) as NoteSummary[])
        setProfile((profileRes.data ?? null) as WorkspaceProfileSummary | null)
      } catch (error: unknown) {
        setToast({ open: true, type: 'error', message: getErrorMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, supabase, user])

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((job) => normalizeJobStatus(job.status) === 'published').length
    const totalCandidates = candidates.length
    const inReview = candidates.filter((candidate) => {
      const stage = normalizeCandidateStage(candidate.status)
      return stage === 'screening' || stage === 'interview' || stage === 'final'
    }).length
    const shortlisted = candidates.filter((candidate) => {
      const stage = normalizeCandidateStage(candidate.status)
      return stage === 'interview' || stage === 'final' || stage === 'hired'
    }).length
    const queued = candidates.filter((candidate) => candidate.processing_status === 'queued').length
    const failed = candidates.filter((candidate) => candidate.processing_status === 'failed').length
    const unscored = candidates.filter((candidate) => typeof candidate.score !== 'number').length

    return {
      activeJobs,
      totalCandidates,
      inReview,
      shortlisted,
      queued,
      failed,
      unscored,
    }
  }, [candidates, jobs])

  const candidatesByJob = useMemo(() => {
    return candidates.reduce<Record<string, CandidateRecord[]>>((accumulator, candidate) => {
      accumulator[candidate.job_id] = [...(accumulator[candidate.job_id] ?? []), candidate]
      return accumulator
    }, {})
  }, [candidates])

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length,
    }))
  }, [candidates])

  const topCandidates = useMemo(() => {
    return [...candidates]
      .filter((candidate) => typeof candidate.score === 'number')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5)
  }, [candidates])

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs])

  const attentionItems = useMemo(
    () => [
      {
        label: 'AI queue',
        value: stats.queued,
        description:
          stats.queued > 0 ? 'Some CVs are still waiting for processing.' : 'No candidate is waiting in queue.',
        href: '/admin/jobs',
        tone: 'warning' as const,
      },
      {
        label: 'Processing failed',
        value: stats.failed,
        description:
          stats.failed > 0 ? 'Retry or review failed candidate analysis.' : 'No processing failures right now.',
        href: '/admin/candidates',
        tone: 'danger' as const,
      },
      {
        label: 'Unscored candidates',
        value: stats.unscored,
        description:
          stats.unscored > 0 ? 'Some candidates still need scoring context.' : 'All current candidates have scores.',
        href: '/admin/candidates',
        tone: 'accent' as const,
      },
    ],
    [stats.failed, stats.queued, stats.unscored]
  )

  const setupItems = useMemo(() => {
    const metadataFullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
    const ownerName = profile?.full_name?.trim() || metadataFullName
    const companyName = workspace?.name?.trim() ?? ''
    const companyWebsite = workspace?.website?.trim() ?? ''
    const companyTagline = workspace?.tagline?.trim() ?? ''

    return [
      {
        label: 'Hiring owner',
        ready: Boolean(ownerName),
        description: ownerName || 'Add the person or team name behind this workspace.',
        href: '/admin/settings',
        actionLabel: ownerName ? 'Edit settings' : 'Add owner',
      },
      {
        label: 'Company identity',
        ready: Boolean(companyName),
        description: companyName || 'Set the company name shown on public job pages.',
        href: '/admin/settings',
        actionLabel: companyName ? 'Update company' : 'Add company',
      },
      {
        label: 'Company context',
        ready: Boolean(companyWebsite || companyTagline),
        description:
          companyWebsite ||
          companyTagline ||
          'Add a website or careers tagline so the public portal feels credible.',
        href: '/admin/settings',
        actionLabel: companyWebsite || companyTagline ? 'Refine profile' : 'Add context',
      },
      {
        label: 'Published role',
        ready: stats.activeJobs > 0,
        description:
          stats.activeJobs > 0
            ? `${stats.activeJobs} published job(s) visible to candidates.`
            : 'Publish at least one role before sharing the portal.',
        href: '/admin/jobs',
        actionLabel: stats.activeJobs > 0 ? 'Manage jobs' : 'Publish a role',
      },
    ]
  }, [profile, stats.activeJobs, user, workspace])

  const readySetupCount = setupItems.filter((item) => item.ready).length
  const lastActivity = notes[0]?.created_at
  const companyName = workspace?.name?.trim() || 'Your company'
  const companyTagline =
    workspace?.tagline?.trim() ||
    'Add a short company story in Settings so public job pages feel trustworthy before candidates apply.'

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Overview"
        title="Admin dashboard"
        description="A simpler control panel for hiring: see what needs attention, move faster between jobs and candidates, and keep the important signals visible."
        actions={
          <>
            <Link href="/admin/jobs" className={adminPrimaryButtonClassName}>
              Jobs
              <ArrowRight size={16} />
            </Link>
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
              Candidates
            </Link>
            <Link href="/admin/analytics" className={adminSecondaryButtonClassName}>
              Analytics
            </Link>
            <Link href="/admin/team" className={adminSecondaryButtonClassName}>
              Team
            </Link>
            <Link href="/admin/settings" className={adminSecondaryButtonClassName}>
              Settings
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
            <AdminStatCard
              label="Published jobs"
              value={String(stats.activeJobs)}
              hint="Roles currently visible to candidates"
              icon={Briefcase}
            />
            <AdminStatCard
              label="Candidates"
              value={String(stats.totalCandidates)}
              hint="Total profiles under review"
              icon={Users}
              tone="accent"
            />
            <AdminStatCard
              label="In review"
              value={String(stats.inReview)}
              hint="Screening, interview, or final review"
              icon={TrendingUp}
              tone="success"
            />
            <AdminStatCard
              label="Queue"
              value={String(stats.queued)}
              hint="Waiting for AI processing"
              icon={Clock3}
              tone={stats.queued > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </AdminStatsGrid>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          eyebrow="Readiness"
          title="Workspace launch checklist"
          description="These basics make the product feel company-ready instead of like an internal prototype."
          action={
            <>
              <Link href="/admin/settings" className={adminSecondaryButtonClassName}>
                Settings
              </Link>
              <Link href="/jobs" className={adminSecondaryButtonClassName}>
                Public preview
                <ArrowUpRight size={16} />
              </Link>
            </>
          }
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Launch progress
                    </div>
                    <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                      {readySetupCount}/{setupItems.length}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      Complete these items before sharing the portal with a real company.
                    </div>
                  </div>
                  <AdminPill
                    label={readySetupCount === setupItems.length ? 'Ready to share' : 'Needs setup'}
                    tone={readySetupCount === setupItems.length ? 'success' : 'warning'}
                  />
                </div>
              </div>

              {setupItems.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black text-slate-950">{item.label}</div>
                      <AdminPill label={item.ready ? 'Ready' : 'Needed'} tone={item.ready ? 'success' : 'warning'} />
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                      {item.description}
                    </div>
                  </div>

                  <Link href={item.href} className={adminSecondaryButtonClassName}>
                    {item.actionLabel}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Public impression"
          title="How the hiring portal reads"
          description="A quick summary of the public-facing story candidates see before they log in."
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-36" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,_#fff9f0_0%,_#fff2de_44%,_#f2e8dc_100%)] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                      Candidate-facing brand
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{companyName}</div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{companyTagline}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-slate-950 shadow-sm">
                    <BadgeCheck size={18} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-sm">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-950">Company profile</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {workspace?.name?.trim() ? 'Visible on public role pages.' : 'Still missing on the public portal.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-sm">
                      <Globe2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-950">Open roles</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {stats.activeJobs > 0
                          ? `${stats.activeJobs} role(s) are currently public.`
                          : 'Nothing is public yet because no job is published.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/jobs" className={adminSecondaryButtonClassName}>
                  Preview jobs portal
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/admin/settings" className={adminPrimaryButtonClassName}>
                  Update company profile
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </AdminSectionCard>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          eyebrow="Pipeline"
          title="Stage distribution"
          description="A quick read of where the pipeline stands right now."
          action={
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
              Open pipeline
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)
              : stageCounts.map((stage) => (
                  <div key={stage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {stage.shortLabel}
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{stage.count}</div>
                  </div>
                ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Attention"
          title="What needs action"
          description="These signals help you find the next thing worth checking."
        >
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)
              : attentionItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-start justify-between gap-4 rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                        {item.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AdminPill label={String(item.value)} tone={item.tone} />
                      <ArrowRight size={16} className="text-slate-300" />
                    </div>
                  </Link>
                ))}

            {!loading && (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Collaboration
                </div>
                <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {lastActivity
                    ? `Last note activity was on ${formatDate(lastActivity)}.`
                    : 'No collaboration notes have been added yet.'}
                </div>
              </div>
            )}
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSectionCard
          eyebrow="Priority candidates"
          title="Top scored profiles"
          description="Keep the strongest candidates one click away."
          action={
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
              All candidates
            </Link>
          }
        >
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : topCandidates.length === 0 ? (
              <AdminEmptyState
                title="No scored candidates yet"
                description="Upload resumes or process queued candidates to start building a ranked shortlist."
              />
            ) : (
              topCandidates.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/admin/candidates/${candidate.id}`}
                  className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-lg font-black text-slate-950">
                      {candidate.full_name || 'Unnamed candidate'}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {candidate.email || candidate.source_filename || 'No email available'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {safeArray(candidate.skills)
                        .slice(0, 4)
                        .map((skill) => (
                          <AdminPill key={skill} label={skill} />
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl px-4 py-3 text-center ${getScoreTone(candidate.score)}`}>
                      <div className="text-2xl font-black">{candidate.score ?? '--'}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em]">
                        {getScoreLabel(candidate.score)}
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Recent jobs"
          title="Latest requisitions"
          description="The newest roles and how much candidate activity they already have."
          action={
            <Link href="/admin/jobs" className={adminSecondaryButtonClassName}>
              All jobs
            </Link>
          }
        >
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : recentJobs.length === 0 ? (
              <AdminEmptyState
                title="No jobs created yet"
                description="Create a job brief first, then candidate review and analytics will start filling in."
              />
            ) : (
              recentJobs.map((job) => {
                const jobCandidates = candidatesByJob[job.id] ?? []
                const lateStage = jobCandidates.filter((candidate) => {
                  const stage = normalizeCandidateStage(candidate.status)
                  return stage === 'interview' || stage === 'final' || stage === 'hired'
                }).length
                const statusMeta = getJobStatusMeta(job.status)

                return (
                  <Link
                    key={job.id}
                    href={`/admin/jobs/${job.id}`}
                    className="block rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-lg font-black text-slate-950">{job.title}</div>
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusMeta.badgeClassName}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <AdminPill label={`${jobCandidates.length} candidates`} />
                          <AdminPill label={`${lateStage} progressed`} tone="success" />
                        </div>
                      </div>
                      <ArrowRight size={18} className="shrink-0 text-slate-300" />
                    </div>
                    <div className="mt-4 text-xs font-semibold text-slate-500">Created {formatDate(job.created_at)}</div>
                  </Link>
                )
              })
            )}
          </div>
        </AdminSectionCard>
      </section>

      {!loading && jobs.length === 0 && candidates.length === 0 ? (
        <section className="mt-6">
          <AdminEmptyState
            title="This workspace is still empty"
            description="Start with a job brief. Once candidates arrive, the rest of the admin panel becomes useful automatically."
            action={
              <Link href="/admin/jobs" className={adminPrimaryButtonClassName}>
                Create first job
              </Link>
            }
          />
        </section>
      ) : null}
    </AppShell>
  )
}
