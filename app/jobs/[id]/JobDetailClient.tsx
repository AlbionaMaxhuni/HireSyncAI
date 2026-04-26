'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Play,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Toast, { type ToastState } from '@/components/ui/Toast'
import BulkUploadDropzone from '@/components/candidates/BulkUploadDropzone'
import {
  PIPELINE_STAGES,
  type CandidateRecord,
  type JobRecord,
  getScoreLabel,
  getScoreTone,
  normalizeCandidateStage,
} from '@/lib/hiring'
import { createClient } from '@/utils/supabase/client'
import type { CandidateStage } from '@/lib/hiring'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

type ProcessingFilter = 'all' | 'queued' | 'processing' | 'done' | 'failed'

export default function JobDetailClient({
  job,
  initialCandidates,
}: {
  job: JobRecord
  initialCandidates: CandidateRecord[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const [candidates, setCandidates] = useState<CandidateRecord[]>(initialCandidates)
  const [search, setSearch] = useState('')
  const [processingFilter, setProcessingFilter] = useState<ProcessingFilter>('all')

  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [retryingFailed, setRetryingFailed] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [resumeText, setResumeText] = useState('')

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const matchesQuery =
        query.length === 0 ||
        candidate.full_name?.toLowerCase().includes(query) ||
        candidate.email?.toLowerCase().includes(query) ||
        candidate.source_filename?.toLowerCase().includes(query) ||
        (candidate.skills ?? []).some((skill) => skill.toLowerCase().includes(query))

      const matchesProcessing =
        processingFilter === 'all' || candidate.processing_status === processingFilter

      return Boolean(matchesQuery && matchesProcessing)
    })
  }, [candidates, processingFilter, search])

  const groupedCandidates = useMemo(() => {
    return PIPELINE_STAGES.reduce<Record<CandidateStage, CandidateRecord[]>>(
      (accumulator, stage) => {
        accumulator[stage.id] = filteredCandidates.filter(
          (candidate) => normalizeCandidateStage(candidate.status) === stage.id
        )
        return accumulator
      },
      {
        applied: [],
        screening: [],
        interview: [],
        final: [],
        hired: [],
        rejected: [],
      }
    )
  }, [filteredCandidates])

  const counts = useMemo(() => {
    return {
      queued: candidates.filter((candidate) => candidate.processing_status === 'queued').length,
      processing: candidates.filter((candidate) => candidate.processing_status === 'processing').length,
      done: candidates.filter((candidate) => candidate.processing_status === 'done').length,
      failed: candidates.filter((candidate) => candidate.processing_status === 'failed').length,
    }
  }, [candidates])

  const workflowCards = [
    {
      step: '1. Add candidates',
      description: 'Use bulk upload for CV files or add one profile manually.',
    },
    {
      step: '2. Process the queue',
      description: 'Run AI screening so summaries, skills, and score become visible.',
    },
    {
      step: '3. Move stages',
      description: 'Open strong candidates or change their stage directly from the board.',
    },
  ]

  const refreshCandidates = async () => {
    setRefreshing(true)

    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCandidates((data ?? []) as CandidateRecord[])
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setRefreshing(false)
    }
  }

  const startProcessing = async () => {
    setProcessing(true)

    try {
      while (true) {
        const response = await fetch('/api/candidates/process-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id, limit: 10 }),
        })

        const payload = (await response.json().catch(() => null)) as { processed?: number; error?: string } | null

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Could not process queued candidates.')
        }

        if (Number(payload?.processed ?? 0) === 0) break
      }

      await refreshCandidates()
      setToast({ open: true, type: 'success', message: 'AI processing completed for the current queue.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setProcessing(false)
    }
  }

  const retryFailed = async () => {
    setRetryingFailed(true)

    try {
      const response = await fetch('/api/candidates/retry-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })

      const payload = (await response.json().catch(() => null)) as { retried?: number; error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Could not retry failed candidates.')
      }

      await refreshCandidates()
      setToast({
        open: true,
        type: 'success',
        message: `${payload?.retried ?? 0} failed candidate(s) moved back to queue.`,
      })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setRetryingFailed(false)
    }
  }

  const updateCandidateStage = async (candidateId: string, nextStage: CandidateStage) => {
    setUpdatingId(candidateId)

    try {
      const { error } = await supabase.from('candidates').update({ status: nextStage }).eq('id', candidateId)
      if (error) throw error

      setCandidates((previous) =>
        previous.map((candidate) =>
          candidate.id === candidateId ? { ...candidate, status: nextStage } : candidate
        )
      )
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteCandidate = async (candidateId: string) => {
    const confirmed = confirm('Delete this candidate profile?')
    if (!confirmed) return

    try {
      const { error } = await supabase.from('candidates').delete().eq('id', candidateId)
      if (error) throw error

      setCandidates((previous) => previous.filter((candidate) => candidate.id !== candidateId))
      setToast({ open: true, type: 'success', message: 'Candidate deleted.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    }
  }

  const createCandidate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fullName.trim() || !resumeText.trim()) return

    setCreating(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('candidates')
        .insert([
          {
            user_id: user?.id,
            job_id: job.id,
            workspace_id: job.workspace_id ?? null,
            full_name: fullName.trim(),
            email: email.trim() || null,
            resume_text: resumeText.trim(),
            status: 'applied',
            processing_status: null,
            processing_error: null,
            source: 'manual-entry',
          },
        ])
        .select('*')
        .single()

      if (error) throw error

      const createdCandidate = data as CandidateRecord
      setCandidates((previous) => [createdCandidate, ...previous])

      let successMessage = 'Candidate added successfully.'

      try {
        const analysisResponse = await fetch('/api/candidates/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            jobDescription: job.description,
            resumeText: resumeText.trim(),
            candidateName: fullName.trim(),
          }),
        })

        const analysisPayload = (await analysisResponse.json().catch(() => null)) as {
          error?: string
          score?: number
          seniority?: string
          status_suggestion?: 'screening' | 'interview' | 'rejected'
          summary?: string
          skills?: string[]
          red_flags?: string[]
          interview_questions?: string[]
        } | null

        if (!analysisResponse.ok) {
          throw new Error(analysisPayload?.error ?? 'Could not analyze candidate.')
        }

        const recommendedNextStep =
          analysisPayload?.status_suggestion === 'interview'
            ? 'Recommended next step: interview.'
            : analysisPayload?.status_suggestion === 'rejected'
              ? 'Recommended next step: careful rejection review.'
              : 'Recommended next step: screening review.'

        const { data: analyzedCandidate, error: analyzeUpdateError } = await supabase
          .from('candidates')
          .update({
            score: typeof analysisPayload?.score === 'number' ? analysisPayload.score : null,
            seniority: analysisPayload?.seniority ?? null,
            summary: [analysisPayload?.summary ?? '', recommendedNextStep].filter(Boolean).join(' '),
            skills: Array.isArray(analysisPayload?.skills) ? analysisPayload.skills : [],
            red_flags: Array.isArray(analysisPayload?.red_flags) ? analysisPayload.red_flags : [],
            interview_questions: Array.isArray(analysisPayload?.interview_questions)
              ? analysisPayload.interview_questions.join('\n')
              : null,
            status: 'screening',
            processing_status: 'done',
            processing_error: null,
          })
          .eq('id', createdCandidate.id)
          .select('*')
          .single()

        if (analyzeUpdateError) throw analyzeUpdateError

        setCandidates((previous) =>
          previous.map((candidate) =>
            candidate.id === createdCandidate.id ? (analyzedCandidate as CandidateRecord) : candidate
          )
        )
        successMessage = 'Candidate added and analyzed successfully.'
      } catch {
        successMessage = 'Candidate added, but AI analysis was skipped. Review it manually for now.'
      }

      setFullName('')
      setEmail('')
      setResumeText('')
      setToast({ open: true, type: 'success', message: successMessage })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <button
            onClick={() => router.push('/admin/jobs')}
            className="inline-flex items-center gap-2 rounded-[10px] bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-200"
          >
            <ArrowLeft size={14} />
            Back to jobs
          </button>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{job.title}</h1>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-relaxed text-slate-500">
            {job.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="Queued" value={String(counts.queued)} />
          <MiniStat label="Processing" value={String(counts.processing)} />
          <MiniStat label="Reviewed" value={String(counts.done)} />
          <MiniStat label="Failed" value={String(counts.failed)} />
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {workflowCards.map((card) => (
          <div key={card.step} className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-950">{card.step}</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{card.description}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or skill"
                className="w-full rounded-[10px] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'queued', 'processing', 'done', 'failed'] as ProcessingFilter[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setProcessingFilter(option)}
                  className={[
                    'rounded-[10px] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition',
                    processingFilter === option
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton onClick={refreshCandidates} busy={refreshing} label="Refresh" icon={RefreshCcw} />
            <ActionButton onClick={startProcessing} busy={processing} label="Run AI queue" icon={Play} />
            <ActionButton
              onClick={retryFailed}
              busy={retryingFailed}
              label="Retry failed"
              icon={RefreshCcw}
              disabled={counts.failed === 0}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              How to manage this role
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Start with queued CVs, then review summaries and move candidates one stage at a time. AI should assist,
              not replace the final decision.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="rounded-[12px] border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {stage.shortLabel}
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {groupedCandidates[stage.id].length}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max gap-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="w-[340px] shrink-0">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dotClassName}`} />
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {stage.label}
                    </div>
                  </div>
                  <div className="rounded-[999px] bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                    {groupedCandidates[stage.id].length}
                  </div>
                </div>

                <div className="min-h-[540px] rounded-[14px] border border-slate-200 bg-slate-50/80 p-3">
                  <div className="space-y-3">
                    {groupedCandidates[stage.id].length === 0 ? (
                      <div className="rounded-[12px] border border-dashed border-slate-200 bg-white/70 p-5 text-sm font-semibold text-slate-500">
                        No candidates in this stage.
                      </div>
                    ) : (
                      groupedCandidates[stage.id].map((candidate) => (
                        <div
                          key={candidate.id}
                          className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-lg font-black text-slate-900">
                                {candidate.full_name || 'Unnamed candidate'}
                              </div>
                              <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                                {candidate.email || candidate.source_filename || 'No email available'}
                              </div>
                            </div>

                            <button
                              onClick={() => deleteCandidate(candidate.id)}
                              className="rounded-[10px] p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Delete candidate"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <div className={`rounded-[10px] px-3 py-2 ${getScoreTone(candidate.score)}`}>
                              <div className="text-xl font-black">{candidate.score ?? '--'}</div>
                              <div className="text-[10px] font-black uppercase tracking-[0.16em]">
                                {getScoreLabel(candidate.score)}
                              </div>
                            </div>
                            <div className="flex-1 rounded-[10px] bg-slate-50 px-3 py-2">
                              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Processing
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-700">
                                {candidate.processing_status || 'not started'}
                              </div>
                            </div>
                          </div>

                          {candidate.summary && (
                            <p className="mt-4 line-clamp-3 text-sm font-semibold leading-relaxed text-slate-600">
                              {candidate.summary}
                            </p>
                          )}

                          {(candidate.skills ?? []).length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {candidate.skills?.slice(0, 4).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-[999px] bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {candidate.processing_error && (
                            <div className="mt-4 rounded-[10px] bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                              {candidate.processing_error}
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                            <select
                              value={normalizeCandidateStage(candidate.status)}
                              onChange={(event) =>
                                updateCandidateStage(candidate.id, event.target.value as CandidateStage)
                              }
                              disabled={updatingId === candidate.id}
                              className="rounded-[10px] border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-900 disabled:opacity-50"
                            >
                              {PIPELINE_STAGES.map((option) => (
                                <option key={option.id} value={option.id}>
                                  Move to {option.label}
                                </option>
                              ))}
                            </select>

                            <Link
                              href={`/admin/candidates/${candidate.id}`}
                              className="inline-flex items-center justify-center rounded-[10px] bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Upload size={18} className="text-blue-600" />
              Bulk upload resumes
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Import PDF or DOCX files directly into this job. The system now tries to analyze them automatically,
              and anything left over can still be processed from the queue.
            </p>
            <div className="mt-4 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Best for large batches of CVs that already belong to this role.
            </div>
            <div className="mt-5">
              <BulkUploadDropzone jobId={job.id} onUploaded={refreshCandidates} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <UserPlus size={18} className="text-blue-600" />
              Add candidate manually
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Useful for referrals, direct outreach, or importing a profile before the original CV is available.
              Pasted resume text is analyzed immediately when possible.
            </p>
            <div className="mt-4 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Best for one candidate at a time when you already have the resume text or recruiter notes.
            </div>

            <form onSubmit={createCandidate} className="mt-5 space-y-4">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Candidate name"
                className="w-full rounded-[10px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-[10px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste resume text or recruiter summary"
                rows={7}
                className="w-full resize-none rounded-[10px] border border-slate-200 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:border-slate-900"
              />
              <button
                type="submit"
                disabled={creating || !fullName.trim() || !resumeText.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {creating ? 'Adding candidate...' : 'Add candidate'}
              </button>
            </form>
          </Card>
        </div>
      </section>
    </AppShell>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

function ActionButton({
  onClick,
  busy,
  label,
  icon: Icon,
  disabled = false,
}: {
  onClick: () => void
  busy: boolean
  label: string
  icon: typeof RefreshCcw
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
      {label}
    </button>
  )
}
