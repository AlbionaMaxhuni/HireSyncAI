'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Users, Briefcase, ArrowRight, AlertCircle } from 'lucide-react'
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
  
  // EDGE CASE state: Per te kapur gabimet globale
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login?message=auth_required')
        return
      }

      setLoading(true)
      setError(null) // Resetojme errorin ne fillim

      try {
        // --- EDGE CASE: Handling API/Network Failure me Try-Catch ---
        const jobsRes = await supabase
          .from('jobs')
          .select('id,title')
          .order('created_at', { ascending: false })

        if (jobsRes.error) throw jobsRes.error

        const map: Record<string, Job> = {}
        // --- EDGE CASE: Handling null data (Jobs) ---
        for (const j of (jobsRes.data ?? []) as Job[]) map[j.id] = j
        setJobsById(map)

        const candRes = await supabase
          .from('candidates')
          .select('id,user_id,job_id,full_name,email,score,status,processing_status,created_at')
          .order('created_at', { ascending: false })

        if (candRes.error) throw candRes.error

        // --- EDGE CASE: Handling empty/null candidates list ---
        setCandidates((candRes.data ?? []) as Candidate[])
      } catch (e: any) {
        console.error("Error loading data:", e)
        setError(e?.message ?? 'Something went wrong while fetching data.')
        showToast('error', 'Failed to sync with database.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user, router, supabase])

  const stats = useMemo(() => {
    // --- EDGE CASE: Safety check nese candidates eshte undefined ---
    const list = candidates || []
    return {
      total: list.length,
      queued: list.filter((c) => c.processing_status === 'queued').length,
      processing: list.filter((c) => c.processing_status === 'processing').length,
      done: list.filter((c) => c.processing_status === 'done').length,
      failed: list.filter((c) => c.processing_status === 'failed').length
    }
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
      </div>

      {/* ERROR UI: Shfaqet nese ka ndodhur nje crash ne fetch */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => window.location.reload()} className="ml-auto underline">Retry</button>
        </div>
      )}

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
            </div>
          ) : candidates.length === 0 && !error ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              No candidates found.
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => {
                // --- EDGE CASE: Handling missing job reference ---
                const job = jobsById[c.job_id]
                const title = (c.full_name || 'Anonymous Candidate').trim()
                
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">{title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                          <Briefcase size={14} /> {job?.title ?? 'Unknown Job'}
                          <span className="text-slate-300">•</span>
                          <span className="capitalize text-blue-600">{c.processing_status}</span>
                        </div>
                      </div>
                      <button 
                        disabled={loading}
                        onClick={() => router.push(`/jobs/${c.job_id}`)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black hover:bg-slate-50 disabled:opacity-50"
                      >
                        View Job
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-sm font-black text-slate-900">Actions</div>
          <button
            onClick={() => router.push('/jobs')}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-blue-600 transition-colors"
          >
            Go to Jobs
          </button>
        </Card>
      </div>
    </AppShell>
  )
}