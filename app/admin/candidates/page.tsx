'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import {
  AdminPageHeader,
  AdminPill,
  adminInputClassName,
  adminSecondaryButtonClassName,
  adminSelectClassName,
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
  getStageMeta,
  normalizeCandidateStage,
  safeArray,
} from '@/lib/hiring'
import type { CandidateStage } from '@/lib/hiring'

type ScoreFilter = 'all' | '80+' | '60+' | 'under60' | 'unscored'

type MetricItem = {
  label: string
  value: string
  hint: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export default function AdminCandidatesPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState<'all' | string>('all')
  const [stageFilter, setStageFilter] = useState<'all' | CandidateStage>('all')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')

  useEffect(() => {
    const load = async () => {
      if (authLoading || !user) return

      setLoading(true)

      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
          supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        ])

        if (jobsRes.error) throw jobsRes.error
        if (candidatesRes.error) throw candidatesRes.error

        setJobs((jobsRes.data ?? []) as JobRecord[])
        setCandidates((candidatesRes.data ?? []) as CandidateRecord[])
      } catch (error: unknown) {
        setToast({ open: true, type: 'error', message: getErrorMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, supabase, user])

  const jobsById = useMemo(() => {
    return jobs.reduce<Record<string, JobRecord>>((accumulator, job) => {
      accumulator[job.id] = job
      return accumulator
    }, {})
  }, [jobs])

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const normalizedStage = normalizeCandidateStage(candidate.status)

      const matchesQuery =
        query.length === 0 ||
        candidate.full_name?.toLowerCase().includes(query) ||
        candidate.email?.toLowerCase().includes(query) ||
        jobsById[candidate.job_id]?.title.toLowerCase().includes(query) ||
        safeArray(candidate.skills).some((skill) => skill.toLowerCase().includes(query))

      const matchesJob = jobFilter === 'all' || candidate.job_id === jobFilter
      const matchesStage = stageFilter === 'all' || normalizedStage === stageFilter

      const score = candidate.score
      const matchesScore =
        scoreFilter === 'all' ||
        (scoreFilter === '80+' && typeof score === 'number' && score >= 80) ||
        (scoreFilter === '60+' && typeof score === 'number' && score >= 60) ||
        (scoreFilter === 'under60' && typeof score === 'number' && score < 60) ||
        (scoreFilter === 'unscored' && typeof score !== 'number')

      return Boolean(matchesQuery && matchesJob && matchesStage && matchesScore)
    })
  }, [candidates, jobFilter, jobsById, scoreFilter, search, stageFilter])

  const stats = useMemo(() => {
    const inReview = candidates.filter((candidate) => {
      const stage = normalizeCandidateStage(candidate.status)
      return stage === 'screening' || stage === 'interview' || stage === 'final'
    }).length

    const interviewPlus = candidates.filter((candidate) => {
      const stage = normalizeCandidateStage(candidate.status)
      return stage === 'interview' || stage === 'final' || stage === 'hired'
    }).length

    const queued = candidates.filter((candidate) => candidate.processing_status === 'queued').length

    return {
      totalCandidates: candidates.length,
      inReview,
      interviewPlus,
      queued,
    }
  }, [candidates])

  const metricItems = useMemo<MetricItem[]>(
    () => [
      { label: 'Candidates', value: String(stats.totalCandidates), hint: 'All profiles' },
      { label: 'In review', value: String(stats.inReview), hint: 'Active review' },
      { label: 'Interview+', value: String(stats.interviewPlus), hint: 'Advanced stages' },
      { label: 'Queued', value: String(stats.queued), hint: 'AI processing' },
    ],
    [stats.inReview, stats.interviewPlus, stats.queued, stats.totalCandidates]
  )

  const stageTabs = useMemo(() => {
    return [
      { id: 'all' as const, label: 'All', count: candidates.length },
      ...PIPELINE_STAGES.map((stage) => ({
        id: stage.id,
        label: stage.shortLabel,
        count: candidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length,
      })),
    ]
  }, [candidates])

  const hasActiveFilters =
    search.trim().length > 0 || jobFilter !== 'all' || stageFilter !== 'all' || scoreFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setJobFilter('all')
    setStageFilter('all')
    setScoreFilter('all')
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Candidates"
        title="Candidate pipeline"
        description="Filter, compare, and open candidate profiles from one table."
        actions={
          <Link href="/admin/jobs" className={adminSecondaryButtonClassName}>
            Jobs
          </Link>
        }
      />

      <MetricStrip items={metricItems} loading={loading} />

      <section className="mt-5 rounded-[10px] border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
          {stageTabs.map((tab) => {
            const active = stageFilter === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageFilter(tab.id)}
                className={[
                  'inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-black transition',
                  active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
              >
                {tab.label}
                <span className={active ? 'text-white/70' : 'text-slate-400'}>{tab.count}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 xl:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidates"
              className={`pl-11 ${adminInputClassName}`}
            />
          </div>

          <select
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
            className={adminSelectClassName}
          >
            <option value="all">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          <select
            value={scoreFilter}
            onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)}
            className={adminSelectClassName}
          >
            <option value="all">All scores</option>
            <option value="80+">80 and above</option>
            <option value="60+">60 and above</option>
            <option value="under60">Under 60</option>
            <option value="unscored">Unscored</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex items-center justify-center rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
          <span>{filteredCandidates.length} candidate(s)</span>
          <span>{hasActiveFilters ? 'Filtered view' : 'All candidates'}</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <EmptyTable
            title="No candidates match the selected filters"
            description="Try another stage, job, score, or search keyword."
          />
        ) : (
          <CandidatesTable candidates={filteredCandidates} jobsById={jobsById} />
        )}
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

function EmptyTable({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="text-base font-black text-slate-950">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{description}</div>
    </div>
  )
}

function CandidatesTable({
  candidates,
  jobsById,
}: {
  candidates: CandidateRecord[]
  jobsById: Record<string, JobRecord>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {['Candidate', 'Job', 'Stage', 'Score', 'Processing', 'Action'].map((header) => (
              <th key={header} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {candidates.map((candidate) => {
            const stage = getStageMeta(candidate.status)
            const job = jobsById[candidate.job_id]

            return (
              <tr key={candidate.id} className="hover:bg-slate-50">
                <td className="max-w-[320px] px-5 py-4">
                  <Link href={`/admin/candidates/${candidate.id}`} className="group block">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <span className="truncate">{candidate.full_name || 'Unnamed candidate'}</span>
                      <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {candidate.email || candidate.source_filename || 'No email available'}
                    </div>
                  </Link>
                </td>
                <td className="max-w-[260px] px-5 py-4 text-sm font-semibold text-slate-600">
                  <span className="line-clamp-1">{job?.title || 'Unknown job'}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${stage.badgeClassName}`}>
                    {stage.label}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className={`inline-flex min-w-16 items-center justify-center rounded-[8px] px-3 py-2 text-sm font-black ${getScoreTone(candidate.score)}`}>
                    {candidate.score ?? '--'}
                    <span className="ml-1 text-[10px] uppercase">{getScoreLabel(candidate.score)}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {candidate.processing_status === 'queued' ? (
                    <AdminPill label="Queued" tone="warning" />
                  ) : candidate.processing_status === 'failed' ? (
                    <AdminPill label="Failed" tone="danger" />
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">{candidate.processing_status || 'Not started'}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <Link href={`/admin/candidates/${candidate.id}`} className={adminSecondaryButtonClassName}>
                    Open
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
