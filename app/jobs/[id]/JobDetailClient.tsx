'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Toast, { type ToastState } from '@/components/ui/Toast'
import BulkUploadDropzone from '@/components/candidates/BulkUploadDropzone'
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Sparkles,
  ChevronDown,
  Clipboard,
  Check,
  Play,
  RefreshCcw,
} from 'lucide-react'

type Job = {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
}

type Candidate = {
  id: string
  user_id: string
  job_id: string
  full_name: string
  email: string | null
  resume_text: string
  score: number | null
  red_flags: string[] | null
  interview_questions: string | null
  status: 'new' | 'shortlisted' | 'rejected'
  created_at: string

  resume_file_path?: string | null
  source_filename?: string | null
  processing_status?: string
  processing_error?: string | null
}

type AiJson = {
  score: number
  red_flags: string[]
  interview_questions: string[]
}

type AiResponsePayload = {
  score?: number
  red_flags?: unknown[]
  interview_questions?: unknown[]
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error ?? 'Unknown error')
}

function extractOpenRouterTextFromSSEChunk(sseChunk: string) {
  const lines = sseChunk.split('\n')
  let out = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const dataStr = trimmed.replace(/^data:\s?/, '')
    if (!dataStr || dataStr === '[DONE]') continue

    try {
      const json = JSON.parse(dataStr)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string') out += delta
    } catch {}
  }
  return out
}

function safeParseAiJson(text: string): AiJson | null {
  try {
    const parsed = JSON.parse(text) as AiResponsePayload
    if (
      typeof parsed?.score === 'number' &&
      Array.isArray(parsed?.red_flags) &&
      Array.isArray(parsed?.interview_questions)
    ) {
      return {
        score: Math.max(1, Math.min(100, Math.round(parsed.score))),
        red_flags: parsed.red_flags.map((x) => String(x)),
        interview_questions: parsed.interview_questions.map((x) => String(x)),
      }
    }
  } catch {}
  return null
}

function formatQuestionsText(qs: string[]) {
  return qs.map((q, i) => `${i + 1}) ${q}`).join('\n')
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-600'
  if (score >= 60) return 'bg-amber-600'
  return 'bg-rose-600'
}

const MIN_RESUME_ANALYZE_CHARS = 200

export default function JobDetailClient({
  job,
  initialCandidates,
}: {
  job: Job
  initialCandidates: Candidate[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ open: true, type, message })

  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates)

  // right panel form
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [creating, setCreating] = useState(false)

  const canCreate = useMemo(() => {
    return fullName.trim().length >= 2 && resumeText.trim().length >= 30
  }, [fullName, resumeText])

  // misc
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [draftById, setDraftById] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [retryingFailed, setRetryingFailed] = useState(false)

  const sortedCandidates = useMemo(() => {
    // Leaderboard: scored first desc, then unscored
    return [...candidates].sort((a, b) => {
      const as = typeof a.score === 'number' ? a.score : -1
      const bs = typeof b.score === 'number' ? b.score : -1
      if (bs !== as) return bs - as
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [candidates])

  const counts = useMemo(() => {
    let queued = 0
    let processing = 0
    let done = 0
    let failed = 0
    for (const c of candidates) {
      const s = c.processing_status
      if (s === 'queued') queued++
      else if (s === 'processing') processing++
      else if (s === 'done') done++
      else if (s === 'failed') failed++
    }
    return { queued, processing, done, failed }
  }, [candidates])

  const refreshCandidates = async () => {
    setRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates((data ?? []) as Candidate[])
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to refresh candidates.')
    } finally {
      setRefreshing(false)
    }
  }

  // AUTO-LOOP processing: keeps calling the queue until processedNow === 0
  const startProcessing = async () => {
    setProcessing(true)
    try {
      let total = 0

      while (true) {
        const res = await fetch('/api/candidates/process-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id, limit: 10 }),
        })

        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error ?? 'Process failed')

        const processedNow = Number(json?.processed ?? 0)
        total += processedNow

        // update UI every batch
        await refreshCandidates()

        // stop when nothing left in queue
        if (processedNow === 0) break
      }

      showToast('success', `Processed total: ${total}`)
    } catch (e: unknown) {
      console.error(e)
      showToast('error', getErrorMessage(e))
    } finally {
      setProcessing(false)
    }
  }

  const retryFailedCandidates = async () => {
    setRetryingFailed(true)
    try {
      const res = await fetch('/api/candidates/retry-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error ?? 'Retry failed')

      await refreshCandidates()
      showToast('success', `Moved back to queue: ${Number(json?.retried ?? 0)}`)
    } catch (e: unknown) {
      console.error(e)
      showToast('error', getErrorMessage(e))
    } finally {
      setRetryingFailed(false)
    }
  }

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1200)
    } catch {
      showToast('error', 'Copy failed.')
    }
  }

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return

    setCreating(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push('/login?message=auth_required')
        return
      }

      const payload = {
        user_id: auth.user.id,
        job_id: job.id,
        full_name: fullName.trim(),
        email: email.trim() || null,
        resume_text: resumeText.trim(),
        status: 'new' as const,
        processing_status: 'done',
        processing_error: null,
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      setCandidates((prev) => [data as Candidate, ...prev])
      setFullName('')
      setEmail('')
      setResumeText('')
      showToast('success', 'Candidate added.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Could not add candidate.')
    } finally {
      setCreating(false)
    }
  }

  const deleteCandidate = async (candidateId: string) => {
    const ok = confirm('Delete this candidate?')
    if (!ok) return

    const { error } = await supabase.from('candidates').delete().eq('id', candidateId)
    if (error) {
      console.error(error)
      showToast('error', 'Could not delete candidate.')
      return
    }

    setCandidates((prev) => prev.filter((c) => c.id !== candidateId))
    showToast('success', 'Candidate deleted.')
  }

  const updateStatus = async (candidateId: string, status: Candidate['status']) => {
    const { error } = await supabase.from('candidates').update({ status }).eq('id', candidateId)
    if (error) {
      console.error(error)
      showToast('error', 'Could not update status.')
      return
    }
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status } : c)))
  }

  const analyzeCandidateStreaming = async (c: Candidate) => {
    const resumeLen = (c.resume_text ?? '').trim().length
    if (resumeLen < MIN_RESUME_ANALYZE_CHARS) {
      showToast('error', `Resume is too short to analyze (min ${MIN_RESUME_ANALYZE_CHARS} chars).`)
      return
    }

    setAnalyzingId(c.id)
    setDraftById((prev) => ({ ...prev, [c.id]: '' }))

    try {
      const res = await fetch('/api/candidates/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.description,
          resumeText: c.resume_text,
          candidateName: c.full_name,
        }),
      })

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error ?? 'Analyze failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let fullText = ''
      let sseBuffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        sseBuffer += chunkText

        const parts = sseBuffer.split('\n\n')
        sseBuffer = parts.pop() ?? ''

        for (const part of parts) {
          const deltaText = extractOpenRouterTextFromSSEChunk(part)
          if (!deltaText) continue
          fullText += deltaText
          setDraftById((prev) => ({ ...prev, [c.id]: fullText }))
        }
      }

      const ai = safeParseAiJson(fullText)
      if (!ai) throw new Error('AI returned invalid JSON')

      const questionsText = formatQuestionsText(ai.interview_questions)

      const { data, error } = await supabase
        .from('candidates')
        .update({
          score: ai.score,
          red_flags: ai.red_flags,
          interview_questions: questionsText,
        })
        .eq('id', c.id)
        .select('*')
        .single()

      if (error) throw error

      setCandidates((prev) => prev.map((x) => (x.id === c.id ? (data as Candidate) : x)))
      showToast('success', 'Insights saved.')
    } catch (err: unknown) {
      console.error(err)
      showToast('error', getErrorMessage(err))
    } finally {
      setAnalyzingId(null)
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => router.push('/jobs')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} className="text-slate-400" />
            Jobs
          </button>

          <div className="mt-4">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Job details
            </div>
            <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-slate-900">
              {job.title}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">
              {job.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_420px]">
        {/* LEFT: Leaderboard */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Leaderboard</div>
              <div className="mt-1 text-xs font-semibold text-slate-400">
                queued: {counts.queued} • processing: {counts.processing} • done: {counts.done} • failed: {counts.failed}
              </div>
            </div>

            <button
              onClick={refreshCandidates}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCcw size={14} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {sortedCandidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              No candidates yet. Upload PDFs/DOCX on the right.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedCandidates.map((c) => {
                const redFlags: string[] = Array.isArray(c.red_flags) ? c.red_flags : []
                const hasScore = typeof c.score === 'number'
                const isAnalyzing = analyzingId === c.id

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{c.full_name}</div>
                          {hasScore && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-black text-white ${scoreColor(
                                c.score as number
                              )}`}
                            >
                              Score {c.score}
                            </span>
                          )}
                          {c.processing_status && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                              {c.processing_status}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          {c.email ?? c.source_filename ?? '—'}
                        </div>

                        {c.processing_status === 'failed' && c.processing_error && (
                          <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                            {c.processing_error}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={c.status}
                            onChange={(e) => updateStatus(c.id, e.target.value as Candidate['status'])}
                            className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-black text-slate-700 outline-none transition focus:border-blue-500"
                          >
                            <option value="new">new</option>
                            <option value="shortlisted">shortlisted</option>
                            <option value="rejected">rejected</option>
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
                        </div>

                        <button
                          onClick={() => deleteCandidate(c.id)}
                          className="rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          aria-label="Delete candidate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Resume text
                        </div>
                        <div className="mt-2 line-clamp-6 text-sm font-semibold text-slate-700">
                          {c.resume_text || '— (will be filled after processing)'}
                        </div>
                        {!!c.resume_text && (
                          <button
                            onClick={() => copy(c.id, c.resume_text)}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-black text-blue-600 transition hover:bg-blue-50"
                            title="Copy resume text"
                          >
                            {copiedId === c.id ? <Check size={14} /> : <Clipboard size={14} />}
                            {copiedId === c.id ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            AI insights
                          </div>

                          <button
                            disabled={isAnalyzing}
                            onClick={() => analyzeCandidateStreaming(c)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-600 disabled:opacity-30"
                            title={
                              (c.resume_text ?? '').trim().length < MIN_RESUME_ANALYZE_CHARS
                                ? `Resume too short (min ${MIN_RESUME_ANALYZE_CHARS} chars)`
                                : 'Analyze'
                            }
                          >
                            <Sparkles size={14} />
                            {isAnalyzing ? 'Analyzing…' : 'Analyze'}
                          </button>
                        </div>

                        <div className="mt-2 space-y-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Red flags
                            </div>
                            {redFlags.length === 0 ? (
                              <div className="mt-1 text-sm font-semibold text-slate-600">
                                No major red flags detected.
                              </div>
                            ) : (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                                {redFlags.map((rf, idx) => (
                                  <li key={idx}>{rf}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Interview questions
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700">
                              {c.interview_questions ?? '—'}
                            </div>
                          </div>
                        </div>

                        {draftById[c.id] && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-black text-slate-500">
                              Raw AI JSON (debug)
                            </summary>
                            <pre className="mt-2 max-h-48 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700">
                              {draftById[c.id]}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* RIGHT: Sticky actions */}
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-auto">
          <div className="space-y-3">
            <Card className="p-4">
              <BulkUploadDropzone
                jobId={job.id}
                onUploaded={async () => {
                  await refreshCandidates()
                }}
              />

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={startProcessing}
                  disabled={processing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-30"
                >
                  <Play size={16} />
                  {processing ? 'Processing…' : 'Start processing'}
                </button>
                <button
                  onClick={retryFailedCandidates}
                  disabled={retryingFailed || counts.failed === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  <RefreshCcw size={16} />
                  {retryingFailed ? 'Retrying…' : 'Retry failed'}
                </button>
              </div>

              <div className="mt-2 text-xs font-semibold text-slate-500">
                Processing now runs automatically until the queue is empty. Use “Retry failed” if parsing or AI analysis previously failed.
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-black text-slate-900">Add candidate (manual)</div>
                <div className="text-[11px] font-semibold text-slate-400">Resume Text</div>
              </div>

              <form onSubmit={createCandidate} className="space-y-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Full name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Arben Krasniqi"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Email (optional)
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arben@email.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Resume text
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume text here (manual MVP)."
                    rows={10}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
                  />
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Minimum ~30 characters to add candidate. Minimum {MIN_RESUME_ANALYZE_CHARS} characters to analyze.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canCreate || creating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-30"
                >
                  <UserPlus size={16} />
                  {creating ? 'Adding…' : 'Add candidate'}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
