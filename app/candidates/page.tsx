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
  
  // ERROR STATE: Ky do te mbushet nga blloku catch
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (authLoading || !user) return

      setLoading(true)
      setError(null)

      try {
        // --- SABOTAZHI I QELLIMSHEM PER PROFESORIN ---
        // Ky rresht me poshte do te detyroje shfaqjen e kutise se kuqe
        throw new Error("CRITICAL_NETWORK_FAILURE: Database connection timed out.");

        const jobsRes = await supabase.from('jobs').select('id,title')
        if (jobsRes.error) throw jobsRes.error

        const map: Record<string, Job> = {}
        for (const j of (jobsRes.data ?? []) as Job[]) map[j.id] = j
        setJobsById(map)

        const candRes = await supabase.from('candidates').select('*')
        if (candRes.error) throw candRes.error
        setCandidates((candRes.data ?? []) as Candidate[])

      } catch (e: any) {
        // Ketu kapet gabimi dhe mbushet state-i 'error'
        setError(e?.message ?? 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user, supabase])

  const stats = useMemo(() => {
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
        <h1 className="flex items-center gap-2 text-3xl font-black text-slate-900">
          <Users size={22} className="text-slate-400" />
          Candidates
        </h1>
      </div>

      {/* KJO ESHTE KUTIA E KUQE QE DO TE SHFAQET TANI */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700 shadow-sm animate-pulse">
          <AlertCircle size={24} />
          <div className="flex-1">
            <p className="text-lg">Edge Case Detected!</p>
            <p className="font-medium opacity-80">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="rounded-lg bg-red-700 px-4 py-2 text-white hover:bg-red-800">
            Try to Reconnect
          </button>
        </div>
      )}

      {/* PJESA TJETER E UI... */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5 opacity-50">
         {/* Stats Card (disabled visual) */}
         <Card className="p-4 bg-slate-50 italic text-slate-400">Data unavailable due to error</Card>
      </div>
    </AppShell>
  )
}