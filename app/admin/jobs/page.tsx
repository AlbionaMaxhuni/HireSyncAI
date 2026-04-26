'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import {
  AdminPageHeader,
  AdminPill,
  adminDangerButtonClassName,
  adminInputClassName,
  adminPrimaryButtonClassName,
  adminSelectClassName,
  adminSecondaryButtonClassName,
  adminTextareaClassName,
} from '@/components/admin/AdminPrimitives'
import AppShell from '@/components/layout/AppShell'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  getJobStatusMeta,
  normalizeCandidateStage,
  normalizeJobStatus,
  type CandidateRecord,
  type JobRecord,
  type JobStatus,
} from '@/lib/hiring'

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

  const metricItems = useMemo<MetricItem[]>(
    () => [
      { label: 'Roles', value: String(totals.totalJobs), hint: 'All roles' },
      { label: 'Published', value: String(totals.published), hint: 'Visible to candidates' },
      { label: 'Drafts', value: String(totals.drafts), hint: 'Private roles' },
      { label: 'Applicants', value: String(totals.totalCandidates), hint: 'Across all roles' },
    ],
    [totals.drafts, totals.published, totals.totalCandidates, totals.totalJobs]
  )

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
        title="Roles"
        description="Create, publish, and manage roles from one table-first workspace."
        actions={
          <Link href="/admin/candidates" className={adminSecondaryButtonClassName}>
            Candidates
          </Link>
        }
      />

      <MetricStrip items={metricItems} loading={loading} />

      <details className="mt-5 rounded-[10px] border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-base font-black text-slate-950">New role</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Create as draft, then publish when ready.</div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-black text-white">
            <Plus size={16} />
            Create
          </span>
        </summary>
        <form onSubmit={createJob} className="grid gap-4 border-t border-slate-200 p-5 xl:grid-cols-[1fr_1fr_auto]">
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
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Visibility</label>
            <select
              value={jobStatus}
              onChange={(event) => setJobStatus(event.target.value as JobStatus)}
              className={`mt-2 w-full ${adminSelectClassName}`}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!canCreate || creating}
              className={`w-full disabled:cursor-not-allowed disabled:opacity-50 ${adminPrimaryButtonClassName}`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create role'}
            </button>
          </div>
          <div className="xl:col-span-3">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Brief</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe responsibilities, must-have skills, experience level, and what success looks like in the role."
              rows={5}
              className={`mt-2 ${adminTextareaClassName}`}
            />
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Minimum 30 characters. A clearer brief gives better AI summaries and a cleaner pipeline.
            </div>
          </div>
        </form>
      </details>

      <section className="mt-5 rounded-[10px] border border-slate-200 bg-white">
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles"
              className={`pl-11 ${adminInputClassName}`}
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span>{filteredJobs.length} result(s)</span>
            {search ? (
              <button type="button" onClick={() => setSearch('')} className={adminSecondaryButtonClassName}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyTable title="No roles yet" description="Create the first role to start receiving candidates." />
        ) : filteredJobs.length === 0 ? (
          <EmptyTable title="No roles match this search" description="Try another keyword or clear the search." />
        ) : (
          <JobsTable
            jobs={filteredJobs}
            candidatesByJob={candidatesByJob}
            updatingJobId={updatingJobId}
            onStatusChange={updateJobStatus}
            onDelete={deleteJob}
          />
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

function JobsTable({
  jobs,
  candidatesByJob,
  updatingJobId,
  onStatusChange,
  onDelete,
}: {
  jobs: JobRecord[]
  candidatesByJob: Record<string, CandidateRecord[]>
  updatingJobId: string | null
  onStatusChange: (jobId: string, nextStatus: JobStatus) => void
  onDelete: (jobId: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {['Role', 'Status', 'Candidates', 'Progress', 'Queue', 'Created', 'Actions'].map((header) => (
              <th key={header} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => {
            const jobCandidates = candidatesByJob[job.id] ?? []
            const queued = jobCandidates.filter((candidate) => candidate.processing_status === 'queued').length
            const progressed = jobCandidates.filter((candidate) => {
              const stage = normalizeCandidateStage(candidate.status)
              return stage === 'interview' || stage === 'final' || stage === 'hired'
            }).length
            const statusMeta = getJobStatusMeta(job.status)
            const normalizedStatus = normalizeJobStatus(job.status)

            return (
              <tr key={job.id} className="hover:bg-slate-50">
                <td className="max-w-[420px] px-5 py-4">
                  <Link href={`/admin/jobs/${job.id}`} className="group block">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <span className="truncate">{job.title}</span>
                      <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{job.description}</div>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${statusMeta.badgeClassName}`}>
                    {statusMeta.label}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-600">{jobCandidates.length}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-600">{progressed}</td>
                <td className="px-5 py-4">
                  <AdminPill label={String(queued)} tone={queued > 0 ? 'warning' : 'neutral'} />
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-500">{formatDate(job.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStatusChange(job.id, normalizedStatus === 'published' ? 'draft' : 'published')}
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
                    <button type="button" onClick={() => onDelete(job.id)} className={adminDangerButtonClassName}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
