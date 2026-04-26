'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  AdminPageHeader,
  AdminPill,
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

type MetricItem = {
  label: string
  value: string
  hint: string
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
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false })

  useEffect(() => {
    const load = async () => {
      if (authLoading || !user) return

      setLoading(true)

      try {
        const [jobsRes, candidatesRes, notesRes] = await Promise.all([
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
          supabase.from('candidates').select('*').order('created_at', { ascending: false }),
          supabase.from('candidate_notes').select('id,candidate_id,created_at').order('created_at', {
            ascending: false,
          }),
        ])

        if (jobsRes.error) throw jobsRes.error
        if (candidatesRes.error) throw candidatesRes.error
        if (notesRes.error) throw notesRes.error

        setJobs((jobsRes.data ?? []) as JobRecord[])
        setCandidates((candidatesRes.data ?? []) as CandidateRecord[])
        setNotes((notesRes.data ?? []) as NoteSummary[])
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

  const metricItems = useMemo<MetricItem[]>(
    () => [
      { label: 'Live roles', value: String(stats.activeJobs), hint: 'Visible to candidates' },
      { label: 'Candidates', value: String(stats.totalCandidates), hint: 'Total profiles' },
      { label: 'In review', value: String(stats.inReview), hint: 'Screening to final' },
      { label: 'AI queue', value: String(stats.queued), hint: 'Waiting for processing' },
    ],
    [stats.activeJobs, stats.inReview, stats.queued, stats.totalCandidates]
  )

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length,
    }))
  }, [candidates])

  const maxStageCount = Math.max(...stageCounts.map((stage) => stage.count), 1)
  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs])
  const recentCandidates = useMemo(() => candidates.slice(0, 6), [candidates])
  const lastActivity = notes[0]?.created_at

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

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Overview"
        title="Admin dashboard"
        description="A focused control room for the hiring workflow: jobs, candidates, queue health, and recent activity."
        actions={
          <>
            <Link href="/admin/jobs" className={adminPrimaryButtonClassName}>
              Open jobs
              <ArrowRight size={16} />
            </Link>
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
              Candidates
            </Link>
          </>
        }
      />

      <MetricStrip items={metricItems} loading={loading} />

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Pipeline distribution"
          action={<Link href="/admin/candidates" className={adminSecondaryButtonClassName}>Open pipeline</Link>}
        >
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {stageCounts.map((stage) => (
                <div key={stage.id} className="grid grid-cols-[120px_1fr_48px] items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                    <span className="text-sm font-black text-slate-700">{stage.shortLabel}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${stage.dotClassName}`}
                      style={{ width: `${Math.max((stage.count / maxStageCount) * 100, stage.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="text-right text-sm font-black text-slate-900">{stage.count}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Needs attention">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {attentionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="text-sm font-black text-slate-950">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{item.description}</div>
                  </div>
                  <AdminPill label={String(item.value)} tone={item.tone} />
                </Link>
              ))}
              <div className="pt-4 text-sm font-semibold text-slate-500">
                {lastActivity ? `Last note activity: ${formatDate(lastActivity)}` : 'No notes added yet.'}
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Recent candidates"
          action={<Link href="/admin/candidates" className={adminSecondaryButtonClassName}>All candidates</Link>}
        >
          {loading ? (
            <Skeleton className="h-56" />
          ) : recentCandidates.length === 0 ? (
            <EmptyLine title="No candidates yet" description="Applications will appear here once candidates apply." />
          ) : (
            <SimpleTable
              headers={['Candidate', 'Stage', 'Source']}
              rows={recentCandidates.map((candidate) => {
                const stage = PIPELINE_STAGES.find((item) => item.id === normalizeCandidateStage(candidate.status))
                return {
                  key: candidate.id,
                  href: `/admin/candidates/${candidate.id}`,
                  cells: [
                    <div key="candidate">
                      <div className="font-black text-slate-950">{candidate.full_name || 'Unnamed candidate'}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{candidate.email || 'No email available'}</div>
                    </div>,
                    stage?.shortLabel || 'Applied',
                    candidate.source || candidate.source_filename || 'Direct entry',
                  ],
                }
              })}
            />
          )}
        </Panel>

        <Panel
          title="Recent roles"
          action={<Link href="/admin/jobs" className={adminSecondaryButtonClassName}>All jobs</Link>}
        >
          {loading ? (
            <Skeleton className="h-56" />
          ) : recentJobs.length === 0 ? (
            <EmptyLine title="No jobs yet" description="Create a role to start the hiring workflow." />
          ) : (
            <SimpleTable
              headers={['Role', 'Status', 'Created']}
              rows={recentJobs.map((job) => ({
                key: job.id,
                href: `/admin/jobs/${job.id}`,
                cells: [
                  <div key="job" className="font-black text-slate-950">{job.title}</div>,
                  normalizeJobStatus(job.status) === 'published' ? 'Published' : 'Draft',
                  formatDate(job.created_at),
                ],
              }))}
            />
          )}
        </Panel>
      </section>
    </AppShell>
  )
}

function MetricStrip({ items, loading }: { items: MetricItem[]; loading: boolean }) {
  return (
    <section className="mt-5 rounded-[10px] border border-slate-200 bg-white">
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-4 md:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
            {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <div className="mt-2 text-3xl font-black text-slate-950">{item.value}</div>}
            <div className="mt-1 text-sm font-semibold text-slate-500">{item.hint}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[10px] border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function EmptyLine({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-10 text-center">
      <div className="text-base font-black text-slate-950">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{description}</div>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<{ key: string; href: string; cells: ReactNode[] }>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            {headers.map((header) => (
              <th key={header} className="px-3 pb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50">
              {row.cells.map((cell, index) => (
                <td key={index} className="px-3 py-4 text-sm font-semibold text-slate-600">
                  {index === 0 ? (
                    <Link href={row.href} className="block">
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
