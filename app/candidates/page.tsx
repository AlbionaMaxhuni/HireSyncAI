'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Users, Briefcase, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Candidate = {
  id: string
  user_id: string
  job_id: string
  full_name: string | null
  email: string | null
  score: number | null
  status: string | null
  processing_status: string | null
  created_at: string
}

type Job = {
  id: string
  title: string
}

export default function CandidatesPage() {
  const supabase = createClient()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ open: true, type, message })

  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobsById, setJobsById] = useState<Record<string, Job>>({})

  useEffect(() => {
    const load = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login?message=auth_required')
        return
      }

      setLoading(true)
      try {
        const jobsRes = await supabase
          .from('jobs')
          .select('id,title')
          .order('created_at', { ascending: false })

        if (jobsRes.error) throw jobsRes.error

        const map: Record<string, Job> = {}
        for (const j of (jobsRes.data ?? []) as Job[]) map[j.id] = j
        setJobsById(map)

        const candRes = await supabase
          .from('candidates')
          .select('id,user_id,job_id,full_name,email,score,status,processing_status,created_at')
          .order('created_at', { ascending: false })

        if (candRes.error) throw candRes.error

        setCandidates((candRes.data ?? []) as Candidate[])
      } catch (e: any) {
        console.error(e)
        showToast('error', e?.message ?? 'Failed to load candidates.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user, router, supabase])

  const stats = useMemo(() => {
    const total = candidates.length
    const queued = candidates.filter((c) => c.processing_status === 'queued').length
    const processing = candidates.filter((c) => c.processing_status === 'processing').length
    const done = candidates.filter((c) => c.processing_status === 'done').length
    const failed = candidates.filter((c) => c.processing_status === 'failed').length
    return { total, queued, processing, done, failed }
  }, [candidates])

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Hiring pipeline
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900">
          <Users size={22} className="text-slate-400" />
          Candidates
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Overview of all candidates across your jobs. Open a job to upload resumes and run AI analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {(['total', 'queued', 'processing', 'done', 'failed'] as const).map((k) => (
          <Card key={k} className="p-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{k}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">
              {loading ? '…' : String((stats as any)[k])}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-black text-slate-900">All candidates</div>
            <div className="text-xs font-semibold text-slate-400">{candidates.length} total</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              No candidates yet. Go to Jobs → open a job → add candidates or bulk upload resumes.
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => {
                const job = jobsById[c.job_id]
                const title = (c.full_name || 'Candidate').trim()
                const score = typeof c.score === 'number' ? c.score : null

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{title}</div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Briefcase size={14} className="text-slate-400" />
                            {job?.title ?? 'Job'}
                          </span>

                          <span className="text-slate-300">•</span>
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>

                          <span className="text-slate-300">•</span>
                          <span className="capitalize">{c.processing_status ?? '—'}</span>

                          {score !== null && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="rounded-xl bg-blue-50 px-2 py-0.5 font-black text-blue-700">
                                Score: {score}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/jobs/${c.job_id}`)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        title="Open job"
                      >
                        Open job <ArrowRight size={14} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-sm font-black text-slate-900">Next actions</div>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Upload resumes and run AI analysis inside each job page.
          </p>
          <button
            onClick={() => router.push('/jobs')}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600"
          >
            Go to Jobs
          </button>

          <div className="mt-4 text-xs font-semibold text-slate-400">
            Tip: queued → process queue → done (score + insights).
          </div>
        </Card>
      </div>
    </AppShell>
  )
}