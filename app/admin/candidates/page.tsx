'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Briefcase, Clock3, Search, SlidersHorizontal, Users } from 'lucide-react'
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminStatCard,
  AdminStatsGrid,
  adminInputClassName,
  adminPrimaryButtonClassName,
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

type ScoreFilter = 'all' | '80+' | '60+' | 'under60' | 'unscored'

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

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: filteredCandidates.filter((candidate) => normalizeCandidateStage(candidate.status) === stage.id).length,
    }))
  }, [filteredCandidates])

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
      jobs: jobs.length,
      inReview,
      interviewPlus,
      queued,
    }
  }, [candidates, jobs.length])

  const hasActiveFilters =
    search.trim().length > 0 || jobFilter !== 'all' || stageFilter !== 'all' || scoreFilter !== 'all'

  const workflowCards = [
    {
      step: '1. Filter the list',
      description: 'Use search, job, stage, or score to narrow the pipeline fast.',
    },
    {
      step: '2. Open a profile',
      description: 'Read the AI summary, skills, red flags, and resume in one place.',
    },
    {
      step: '3. Move the candidate',
      description: 'Decide the next stage and keep the pipeline updated after each review.',
    },
  ]

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
        description="This page should be straightforward: filter the pipeline, open a profile, then move the right people forward."
        actions={
          <Link href="/admin/jobs" className={adminSecondaryButtonClassName}>
            Jobs
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
              value={String(stats.totalCandidates)}
              hint="Every profile in the pipeline"
              icon={Users}
            />
            <AdminStatCard
              label="In review"
              value={String(stats.inReview)}
              hint="Screening, interview, or final"
              icon={Clock3}
              tone="accent"
            />
            <AdminStatCard
              label="Interview+"
              value={String(stats.interviewPlus)}
              hint="Interview, final review, or hired"
              icon={ArrowRight}
              tone="success"
            />
            <AdminStatCard
              label="Queued"
              value={String(stats.queued)}
              hint="Waiting for AI processing"
              icon={SlidersHorizontal}
              tone={stats.queued > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </AdminStatsGrid>

      <section className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {workflowCards.map((card) => (
          <div key={card.step} className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-950">{card.step}</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{card.description}</div>
          </div>
        ))}
      </section>

      <section className="mt-5">
        <AdminFilterBar>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, job, or skill"
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
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as 'all' | CandidateStage)}
              className={adminSelectClassName}
            >
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
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
              className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <SlidersHorizontal size={14} />
            {filteredCandidates.length} candidate(s) match the current filters
          </div>
        </AdminFilterBar>
      </section>

      <section className="mt-5">
        <AdminSectionCard
          eyebrow="Stage view"
          title="Filtered pipeline"
          description="The stage counts below react to the current filters so you can narrow the list without losing context."
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)
              : stageCounts.map((stage) => (
                  <div key={stage.id} className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {stage.shortLabel}
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{stage.count}</div>
                  </div>
                ))}
          </div>
        </AdminSectionCard>
      </section>

      <section className="mt-5">
        <AdminSectionCard
          eyebrow="Results"
          title="Candidate list"
          description="A cleaner list with the most useful information surfaced first."
        >
          <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </>
            ) : filteredCandidates.length === 0 ? (
              <AdminEmptyState
                title="No candidates match the selected filters"
                description="Try another combination of stage, job, or score filters to broaden the list."
                action={
                  hasActiveFilters ? (
                    <button type="button" onClick={resetFilters} className={adminPrimaryButtonClassName}>
                      Reset filters
                    </button>
                  ) : null
                }
              />
            ) : (
              filteredCandidates.map((candidate) => {
                const stage = getStageMeta(candidate.status)
                const job = jobsById[candidate.job_id]

                return (
                  <Link
                    key={candidate.id}
                    href={`/admin/candidates/${candidate.id}`}
                    className="block rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-lg font-black tracking-tight text-slate-950">
                            {candidate.full_name || 'Unnamed candidate'}
                          </div>
                          <span
                            className={`rounded-[999px] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${stage.badgeClassName}`}
                          >
                            {stage.label}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
                          <span>{candidate.email || 'No email available'}</span>
                          <span className="inline-flex items-center gap-1.5">
                            <Briefcase size={14} />
                            {job?.title || 'Unknown job'}
                          </span>
                          {candidate.seniority ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Users size={14} />
                              {candidate.seniority}
                            </span>
                          ) : null}
                        </div>

                        {candidate.summary ? (
                          <p className="mt-4 line-clamp-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                            {candidate.summary}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {safeArray(candidate.skills)
                            .slice(0, 5)
                            .map((skill) => (
                              <AdminPill key={skill} label={skill} />
                            ))}
                          {candidate.processing_status === 'queued' ? (
                            <AdminPill label="Queued" tone="warning" />
                          ) : null}
                          {candidate.processing_status === 'failed' ? (
                            <AdminPill label="Failed" tone="danger" />
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`rounded-[10px] px-4 py-3 text-center ${getScoreTone(candidate.score)}`}>
                          <div className="text-2xl font-black">{candidate.score ?? '--'}</div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em]">
                            {getScoreLabel(candidate.score)}
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-slate-300" />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </AdminSectionCard>
      </section>
    </AppShell>
  )
}
