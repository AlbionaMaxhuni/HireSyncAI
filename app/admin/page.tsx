'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Briefcase, Building2, Clock3, TrendingUp, Users } from 'lucide-react'
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
  normalizeJobStatus,
  normalizeCandidateStage,
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

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length,
    }))
  }, [candidates])

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs])
  const recentCandidates = useMemo(() => candidates.slice(0, 5), [candidates])

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
  const workflowSteps = useMemo(
    () => [
      {
        step: '1. Set company profile',
        description: 'Add company name, website, and tagline so the portal looks real.',
        done: Boolean(workspace?.name?.trim()),
        href: '/admin/settings',
      },
      {
        step: '2. Create and publish a job',
        description: 'A published role is what candidates actually see and apply to.',
        done: stats.activeJobs > 0,
        href: '/admin/jobs',
      },
      {
        step: '3. Review incoming candidates',
        description: 'Open the pipeline, process CVs, and move strong candidates forward.',
        done: stats.totalCandidates > 0,
        href: '/admin/candidates',
      },
    ],
    [stats.activeJobs, stats.totalCandidates, workspace]
  )

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

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          eyebrow="Start here"
          title="How to use this workspace"
          description="Follow these three steps in order. If the app feels confusing, start here every time."
          action={
            <Link href="/admin/jobs" className={adminPrimaryButtonClassName}>
              Open jobs
              <ArrowRight size={16} />
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="space-y-3">
              {workflowSteps.map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col gap-4 rounded-[12px] border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-black text-slate-950">{item.step}</div>
                      <AdminPill label={item.done ? 'Done' : 'Next'} tone={item.done ? 'success' : 'warning'} />
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                      {item.description}
                    </div>
                  </div>

                  <Link href={item.href} className={adminSecondaryButtonClassName}>
                    Open
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}

              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-slate-950">Workspace progress</div>
                  <AdminPill
                    label={`${readySetupCount}/${setupItems.length} ready`}
                    tone={readySetupCount === setupItems.length ? 'success' : 'warning'}
                  />
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-500">
                  The product feels much clearer once company details are filled in and one role is public.
                </div>
              </div>
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Next actions"
          title="Do these first"
          description="These are the most important actions for a new workspace. Everything else can wait."
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <div className="space-y-4">
              <QuickActionCard
                icon={Building2}
                title="Complete company profile"
                description="Candidates trust the portal more when the company name and tagline are real."
                href="/admin/settings"
                action="Open settings"
              />
              <QuickActionCard
                icon={Briefcase}
                title="Create or publish a role"
                description="Published jobs are the real starting point of the hiring flow."
                href="/admin/jobs"
                action="Manage jobs"
              />
              <QuickActionCard
                icon={Users}
                title="Review the candidate pipeline"
                description="Process CVs, check scores, and move good candidates to the next stage."
                href="/admin/candidates"
                action="Open candidates"
              />
              <div className="flex flex-wrap gap-3">
                <Link href="/jobs" className={adminSecondaryButtonClassName}>
                  Preview public portal
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </AdminSectionCard>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminSectionCard
          eyebrow="Attention"
          title="What needs action"
          description="Look here first if you are not sure what to do next."
          action={
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>Open pipeline</Link>
          }
        >
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)
              : attentionItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-start justify-between gap-4 rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
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
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
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

        <AdminSectionCard
          eyebrow="Current pipeline"
          title="Recent candidates and stages"
          description="This is the fastest way to understand what is happening right now."
          action={
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>All candidates</Link>
          }
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.78fr_1.22fr]">
            {loading ? (
              <>
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Stage distribution
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {stageCounts.map((stage) => (
                        <div key={stage.id} className="rounded-[10px] border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {stage.shortLabel}
                            </div>
                          </div>
                          <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{stage.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Latest activity
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-500">
                      {lastActivity ? `Last note activity: ${formatDate(lastActivity)}` : 'No notes added yet.'}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {recentCandidates.length === 0 ? (
                    <AdminEmptyState
                      title="No candidates yet"
                      description="Once applications arrive, this area becomes the fastest way to open the right profile."
                    />
                  ) : (
                    recentCandidates.map((candidate) => (
                      <Link
                        key={candidate.id}
                        href={`/admin/candidates/${candidate.id}`}
                        className="flex items-center justify-between gap-4 rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-slate-950">
                            {candidate.full_name || 'Unnamed candidate'}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {candidate.email || candidate.source_filename || 'No email available'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <AdminPill
                            label={PIPELINE_STAGES.find((item) => item.id === normalizeCandidateStage(candidate.status))?.shortLabel || 'Applied'}
                            tone="neutral"
                          />
                          <ArrowRight size={16} className="text-slate-300" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-6">
        <AdminSectionCard
          eyebrow="Latest jobs"
          title="Recent roles"
          description="Open a role to upload CVs, process candidates, and manage that pipeline."
          action={<Link href="/admin/jobs" className={adminSecondaryButtonClassName}>All jobs</Link>}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : recentJobs.length === 0 ? (
            <AdminEmptyState
              title="No jobs created yet"
              description="Create a job first. That is the main starting point of the whole workspace."
              action={
                <Link href="/admin/jobs" className={adminPrimaryButtonClassName}>
                  Create first job
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-950">{job.title}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {normalizeJobStatus(job.status) === 'published' ? 'Published role' : 'Draft role'}
                      </div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
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

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: typeof Building2
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-[10px] bg-slate-50 p-3 text-slate-900">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950">{title}</div>
          <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{description}</div>
          <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-slate-950">
            {action}
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  )
}
