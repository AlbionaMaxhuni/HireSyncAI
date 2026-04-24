'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Briefcase, Loader2, Plus, Search, Trash2, Users } from 'lucide-react'
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPageHeader,
  AdminPill,
  AdminSectionCard,
  AdminStatCard,
  AdminStatsGrid,
  adminDangerButtonClassName,
  adminInputClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminTextareaClassName,
} from '@/components/admin/AdminPrimitives'
import AppShell from '@/components/layout/AppShell'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { getJobStatusMeta, normalizeCandidateStage, normalizeJobStatus, type CandidateRecord, type JobRecord, type JobStatus } from '@/lib/hiring'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}

export default function AdminJobsPage() {
  const supabase = createClient()
  const { user, workspace, loading: authLoading } = useAuth()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [candidates, setCandidates] = useState<CandidateRecord[]>([])
  const [search, setSearch] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [jobStatus, setJobStatus] = useState<JobStatus>('draft')

  useEffect(() => {
    const load = async () => {
      if (authLoading || !user) return

      setLoading(true)

      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from('jobs').select('*').order('created_at', { ascending: false }),
          supabase.from('candidates').select('*'),
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

  const titleTrimmed = title.trim()
  const descriptionTrimmed = description.trim()
  const canCreate = titleTrimmed.length >= 3 && descriptionTrimmed.length >= 30 && Boolean(workspace?.id)

  const candidatesByJob = useMemo(() => {
    return candidates.reduce<Record<string, CandidateRecord[]>>((accumulator, candidate) => {
      accumulator[candidate.job_id] = [...(accumulator[candidate.job_id] ?? []), candidate]
      return accumulator
    }, {})
  }, [candidates])

  const totals = useMemo(() => {
    const totalJobs = jobs.length
    const totalCandidates = candidates.length
    const published = jobs.filter((job) => normalizeJobStatus(job.status) === 'published').length
    const drafts = jobs.filter((job) => normalizeJobStatus(job.status) === 'draft').length
    const queued = candidates.filter((candidate) => candidate.processing_status === 'queued').length

    return {
      totalJobs,
      totalCandidates,
      published,
      drafts,
      queued,
    }
  }, [candidates, jobs])

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return jobs

    return jobs.filter((job) => {
      return job.title.toLowerCase().includes(query) || job.description.toLowerCase().includes(query)
    })
  }, [jobs, search])

  const createJob = async (event: FormEvent) => {
    event.preventDefault()

    if (!user?.id || !workspace?.id || !canCreate) return

    setCreating(true)

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([
            {
              user_id: user.id,
              workspace_id: workspace.id,
              title: titleTrimmed,
              description: descriptionTrimmed,
              status: jobStatus,
            },
          ])
        .select('*')
        .single()

      if (error) throw error

      setJobs((previous) => [data as JobRecord, ...previous])
      setTitle('')
      setDescription('')
      setJobStatus('draft')
      setToast({ open: true, type: 'success', message: 'Job created successfully.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setCreating(false)
    }
  }

  const updateJobStatus = async (jobId: string, nextStatus: JobStatus) => {
    setUpdatingJobId(jobId)

    try {
      const { error } = await supabase.from('jobs').update({ status: nextStatus }).eq('id', jobId)
      if (error) throw error

      setJobs((previous) =>
        previous.map((job) => (job.id === jobId ? { ...job, status: nextStatus } : job))
      )
      setToast({
        open: true,
        type: 'success',
        message: nextStatus === 'published' ? 'Job published.' : 'Job moved back to draft.',
      })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setUpdatingJobId(null)
    }
  }

  const deleteJob = async (jobId: string) => {
    const confirmed = confirm('Delete this job and its linked candidates?')
    if (!confirmed) return

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobId)
      if (error) throw error

      setJobs((previous) => previous.filter((job) => job.id !== jobId))
      setCandidates((previous) => previous.filter((candidate) => candidate.job_id !== jobId))
      setToast({ open: true, type: 'success', message: 'Job deleted.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <AdminPageHeader
        eyebrow="Jobs"
        title="Job management"
        description="Keep roles clear, searchable, and easy to manage. This page is now focused on the two things that matter most: finding a role fast and creating a strong brief."
        actions={
          <>
            <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
              Candidates
            </Link>
            <Link href="/admin/analytics" className={adminSecondaryButtonClassName}>
              Analytics
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
            <AdminStatCard label="Jobs" value={String(totals.totalJobs)} hint="All roles in the workspace" icon={Briefcase} />
            <AdminStatCard
              label="Published"
              value={String(totals.published)}
              hint={`${totals.drafts} draft job(s) still private`}
              icon={ArrowRight}
              tone="success"
            />
            <AdminStatCard
              label="Applicants"
              value={String(totals.totalCandidates)}
              hint="Candidates attached to jobs"
              icon={Users}
              tone="accent"
            />
            <AdminStatCard
              label="Queued"
              value={String(totals.queued)}
              hint="Waiting for AI processing"
              icon={Loader2}
              tone={totals.queued > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </AdminStatsGrid>

      <section className="mt-6">
        <AdminFilterBar>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs by title or description"
                className={`pl-11 ${adminInputClassName}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                {filteredJobs.length} result(s)
              </div>
              {search ? (
                <button type="button" onClick={() => setSearch('')} className={adminSecondaryButtonClassName}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </AdminFilterBar>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminSectionCard
          eyebrow="Open roles"
          title="Job list"
          description="Review draft and published briefs, control visibility, and open the right role quickly."
        >
          <div className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </>
            ) : jobs.length === 0 ? (
              <AdminEmptyState
                title="No jobs yet"
                description="Create your first role brief on the right side to start receiving and organizing candidates."
              />
            ) : filteredJobs.length === 0 ? (
              <AdminEmptyState
                title="No jobs match this search"
                description="Try another keyword or clear the search to see every role again."
              />
            ) : (
              filteredJobs.map((job) => {
                const jobCandidates = candidatesByJob[job.id] ?? []
                const queued = jobCandidates.filter((candidate) => candidate.processing_status === 'queued').length
                const progressed = jobCandidates.filter((candidate) => {
                  const stage = normalizeCandidateStage(candidate.status)
                  return stage === 'interview' || stage === 'final' || stage === 'hired'
                }).length
                const statusMeta = getJobStatusMeta(job.status)
                const normalizedStatus = normalizeJobStatus(job.status)

                return (
                  <div
                    key={job.id}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-slate-950 p-2 text-white">
                            <Briefcase size={16} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-xl font-black tracking-tight text-slate-950">{job.title}</div>
                              <span
                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusMeta.badgeClassName}`}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Created {formatDate(job.created_at)}
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 line-clamp-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                          {job.description}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <AdminPill label={`${jobCandidates.length} candidates`} />
                          <AdminPill label={`${progressed} progressed`} tone="success" />
                          <AdminPill label={`${queued} queued`} tone={queued > 0 ? 'warning' : 'neutral'} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/jobs/${job.id}`} className={adminPrimaryButtonClassName}>
                          Open job
                          <ArrowRight size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            updateJobStatus(job.id, normalizedStatus === 'published' ? 'draft' : 'published')
                          }
                          disabled={updatingJobId === job.id}
                          className={adminSecondaryButtonClassName}
                        >
                          {updatingJobId === job.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : normalizedStatus === 'published' ? (
                            'Move to draft'
                          ) : (
                            'Publish'
                          )}
                        </button>
                        <button onClick={() => deleteJob(job.id)} className={adminDangerButtonClassName}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Create"
          title="New job brief"
          description="Start private by default, then publish only when the brief is ready for candidates."
        >
          <form onSubmit={createJob} className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Job title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Senior Product Designer"
                className={`mt-2 ${adminInputClassName}`}
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Brief</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe responsibilities, must-have skills, experience level, and what success looks like in the role."
                rows={11}
                className={`mt-2 ${adminTextareaClassName}`}
              />
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Minimum 30 characters. A clearer brief gives better AI summaries and a cleaner pipeline.
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Visibility</label>
              <select
                value={jobStatus}
                onChange={(event) => setJobStatus(event.target.value as JobStatus)}
                className={`mt-2 ${adminInputClassName}`}
              >
                <option value="draft">Draft (recommended)</option>
                <option value="published">Published immediately</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!canCreate || creating}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating job...' : 'Create job'}
            </button>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">What belongs in a good brief</div>
              <div className="mt-2 space-y-2 text-sm font-semibold leading-relaxed text-slate-500">
                <div>Mission of the role and expected ownership.</div>
                <div>Must-have skills and seniority level.</div>
                <div>What you want to validate during interviews.</div>
              </div>
            </div>
          </form>
        </AdminSectionCard>
      </section>
    </AppShell>
  )
}
