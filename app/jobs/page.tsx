'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Toast, { type ToastState } from '@/components/ui/Toast'
import Skeleton from '@/components/ui/Skeleton'
import { Plus, ArrowRight, Briefcase, Trash2 } from 'lucide-react'

type Job = {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
}

export default function JobsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ open: true, type, message })

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const titleTrim = title.trim()
  const descTrim = description.trim()

  const titleOk = titleTrim.length >= 3
  const descOk = descTrim.length >= 5

  const canCreate = useMemo(() => titleOk && descOk, [titleOk, descOk])

  const disabledReason = useMemo(() => {
    if (!titleOk && !descOk) return 'Title is too short and description is too short.'
    if (!titleOk) return 'Title is too short (min 3 characters).'
    if (!descOk) return 'Description is too short (min 5 characters).'
    return ''
  }, [titleOk, descOk])

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login?message=auth_required')
        return
      }
      setUserId(data.user.id)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        showToast('error', 'Failed to load jobs.')
        setLoading(false)
        return
      }

      setJobs((data ?? []) as Job[])
      setLoading(false)
    }

    load()
  }, [userId, supabase])

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !canCreate) return

    setCreating(true)
    try {
      const payload = {
        user_id: userId,
        title: titleTrim,
        description: descTrim,
      }

      const { data, error } = await supabase.from('jobs').insert([payload]).select('*').single()
      if (error) throw error

      const job = data as Job
      setJobs((prev) => [job, ...prev])
      setTitle('')
      setDescription('')
      showToast('success', 'Job created.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Could not create job.')
    } finally {
      setCreating(false)
    }
  }

  const deleteJob = async (jobId: string) => {
    if (!userId) return
    const ok = confirm('Delete this job? Candidates under it will also be deleted.')
    if (!ok) return

    const { error } = await supabase.from('jobs').delete().eq('user_id', userId).eq('id', jobId)
    if (error) {
      console.error(error)
      showToast('error', 'Could not delete job.')
      return
    }

    setJobs((prev) => prev.filter((j) => j.id !== jobId))
    showToast('success', 'Job deleted.')
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Hiring pipeline
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Jobs</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Create a job, then add candidates (resume text) and generate AI insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_420px]">
        {/* Jobs list */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">Your jobs</div>
            <div className="text-xs font-semibold text-slate-400">{jobs.length} total</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              No jobs yet. Create your first one on the right.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="group rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => router.push(`/jobs/${j.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-slate-400" />
                        <div className="truncate text-sm font-black text-slate-900">{j.title}</div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">
                        {j.description}
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-400">
                        {new Date(j.created_at).toLocaleDateString()}
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/jobs/${j.id}`)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
                        title="Open"
                        aria-label="Open"
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteJob(j.id)
                        }}
                        className="rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Delete"
                        aria-label="Delete job"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Create job */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">Create job</div>
            <div className="text-[11px] font-semibold text-slate-400">MVP</div>
          </div>

          <form onSubmit={createJob} className="space-y-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
              />
              <div className="mt-1 text-[11px] font-semibold text-slate-500">
                {titleOk ? 'OK' : 'Min 3 characters.'}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                Job description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the job description here..."
                rows={10}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
              />
              <div className="mt-1 text-[11px] font-semibold text-slate-500">
                {descOk ? 'OK' : 'Min 5 characters.'}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canCreate || creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-30"
              title={!canCreate ? disabledReason : 'Create job'}
            >
              <Plus size={16} />
              {creating ? 'Creating…' : 'Create job'}
            </button>

            {!canCreate && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                {disabledReason}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              Next: open the job → add candidates → analyze with streaming AI.
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}