'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Briefcase, NotebookText, TrendingUp, Users } from 'lucide-react'
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminStatCard,
  AdminStatsGrid,
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
  normalizeCandidateStage,
} from '@/lib/hiring'

type NoteSummary = {
  id: string
  candidate_id: string
  created_at: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function formatSourceLabel(source: string) {
  return source
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export default function AdminAnalyticsPage() {
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
          supabase.from('candidates').select('*'),
          supabase.from('candidate_notes').select('id,candidate_id,created_at'),
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

  const overview = useMemo(() => {
    const totalCandidates = candidates.length
    const shortlisted = candidates.filter((candidate) => {
      const stage = normalizeCandidateStage(candidate.status)
      return stage === 'interview' || stage === 'final' || stage === 'hired'
    }).length
    const scoredCandidates = candidates.filter((candidate) => typeof candidate.score === 'number')
    const averageScore =
      scoredCandidates.length === 0
        ? '--'
        : Math.round(scoredCandidates.reduce((sum, candidate) => sum + (candidate.score ?? 0), 0) / scoredCandidates.length).toString()
    const notedCandidates = new Set(notes.map((note) => note.candidate_id)).size
    const noteCoverage =
      totalCandidates === 0 ? '0%' : `${Math.round((notedCandidates / totalCandidates) * 100)}%`

    return {
      totalCandidates,
      shortlisted,
      averageScore,
      noteCoverage,
      notedCandidates,
    }
  }, [candidates, notes])

  const stageData = useMemo(() => {
    const total = Math.max(candidates.length, 1)

    return PIPELINE_STAGES.map((stage) => {
      const count = candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length

      return {
        ...stage,
        count,
        percentage: Math.round((count / total) * 100),
      }
    })
  }, [candidates])

  const sourceData = useMemo(() => {
    const counts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
      const source = candidate.source || 'manual-entry'
      accumulator[source] = (accumulator[source] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [candidates])

  const queueStats = useMemo(() => {
    const queued = candidates.filter((candidate) => candidate.processing_status === 'queued').length
    const failed = candidates.filter((candidate) => candidate.processing_status === 'failed').length
    const hired = candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === 'hired').length

    return {
      queued,
      failed,
      hired,
    }
  }, [candidates])

  const jobRows = useMemo(() => {
    return jobs.map((job) => {
      const jobCandidates = candidates.filter((candidate) => candidate.job_id === job.id)
      const progressed = jobCandidates.filter((candidate) => {
        const stage = normalizeCandidateStage(candidate.status)
        return stage === 'interview' || stage === 'final' || stage === 'hired'
      }).length
      const noteCount = notes.filter((note) => jobCandidates.some((candidate) => candidate.id === note.candidate_id)).length
      const conversion = jobCandidates.length === 0 ? '0%' : `${Math.round((progressed / jobCandidates.length) * 100)}%`

      return {
        job,
        total: jobCandidates.length,
        progressed,
        noteCount,
        conversion,
      }
    })
  }, [candidates, jobs, notes])

  const analyticsSteps = [
    '1. Check pipeline stage distribution first.',
    '2. Look at queued or failed processing before deeper analysis.',
    '3. Compare roles only after the top-level signals make sense.',
  ]

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Analytics"
        title="Hiring analytics"
        description="Keep this page practical: first understand the pipeline, then check operational issues, then compare jobs."
        actions={
          <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
            Candidates
          </Link>
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
              label="Candidates"
              value={String(overview.totalCandidates)}
              hint="Total profiles tracked"
              icon={Users}
            />
            <AdminStatCard
              label="Shortlisted"
              value={String(overview.shortlisted)}
              hint="Interview, final, or hired"
              icon={TrendingUp}
              tone="success"
            />
            <AdminStatCard
              label="Avg score"
              value={overview.averageScore}
              hint="Average across scored candidates"
              icon={BarChart3}
              tone="accent"
            />
            <AdminStatCard
              label="Note coverage"
              value={overview.noteCoverage}
              hint={`${overview.notedCandidates} candidates have notes`}
              icon={NotebookText}
              tone="warning"
            />
          </>
        )}
      </AdminStatsGrid>

      <section className="mt-5 rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">How to read this page</div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {analyticsSteps.map((step) => (
            <div key={step} className="rounded-[12px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminSectionCard
          eyebrow="Pipeline"
          title="Where candidates are now"
          description="This is the fastest way to understand if the pipeline is balanced or stuck."
        >
          <div className="space-y-4">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16" />)
              : stageData.map((stage) => (
                  <div key={stage.id}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                        <div className="text-sm font-black text-slate-700">{stage.label}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-500">
                        {stage.count} candidate(s) | {stage.percentage}%
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className={`h-3 rounded-full ${stage.dotClassName}`}
                        style={{ width: `${Math.max(stage.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Signals"
          title="What needs attention"
          description="Check queue health and source mix before going deeper into the numbers."
        >
          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SignalCard label="Queued" value={String(queueStats.queued)} tone="warning" />
                  <SignalCard label="Failed" value={String(queueStats.failed)} tone="danger" />
                  <SignalCard label="Hired" value={String(queueStats.hired)} tone="success" />
                </div>

                <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Activity size={14} />
                    Source mix
                  </div>

                  {sourceData.length === 0 ? (
                    <div className="mt-3 text-sm font-semibold text-slate-500">No source data available yet.</div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {sourceData.map((source) => (
                        <AdminPill
                          key={source.source}
                          label={`${formatSourceLabel(source.source)}: ${source.count}`}
                          tone="neutral"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-5">
        <AdminSectionCard
          eyebrow="By role"
          title="Roles at a glance"
          description="Use this table only after the pipeline and queue look healthy."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Job
                  </th>
                  <th className="px-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Candidates
                  </th>
                  <th className="px-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Progressed
                  </th>
                  <th className="px-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Conversion
                  </th>
                  <th className="px-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <Skeleton className="h-24" />
                    </td>
                  </tr>
                ) : jobRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <AdminEmptyState
                        title="No jobs created yet"
                        description="Analytics becomes useful after you add roles and start collecting candidates."
                      />
                    </td>
                  </tr>
                ) : (
                  jobRows.map((row) => (
                    <tr key={row.job.id} className="rounded-[12px] bg-slate-50">
                      <td className="rounded-l-[12px] px-4 py-4 text-sm font-black text-slate-950">
                        <Link href={`/admin/jobs/${row.job.id}`} className="inline-flex items-center gap-2 hover:text-blue-700">
                          <Briefcase size={15} />
                          {row.job.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">{row.total}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">{row.progressed}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">{row.conversion}</td>
                      <td className="rounded-r-[12px] px-4 py-4 text-sm font-semibold text-slate-600">{row.noteCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSectionCard>
      </section>
    </AppShell>
  )
}

function SignalCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'warning' | 'danger'
}) {
  const className =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-rose-50 text-rose-700'

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={['mt-3 inline-flex rounded-[10px] px-4 py-3 text-2xl font-black tracking-tight', className].join(' ')}>
        {value}
      </div>
    </div>
  )
}
