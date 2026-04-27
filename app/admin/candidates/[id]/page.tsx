'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Toast, { type ToastState } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { buildCandidateStatusEmail, buildMailtoHref } from '@/lib/communications'
import { createClient } from '@/utils/supabase/client'
import {
  PIPELINE_STAGES,
  type CandidateNoteRecord,
  type CandidateRecord,
  getScoreLabel,
  getScoreTone,
  normalizeCandidateStage,
  safeArray,
} from '@/lib/hiring'
import type { CandidateStage } from '@/lib/hiring'

type CandidateProfile = CandidateRecord & {
  jobs?: {
    title: string
  } | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export default function AdminCandidateProfilePage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const { workspace } = useAuth()

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [notes, setNotes] = useState<CandidateNoteRecord[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingNote, setSubmittingNote] = useState(false)
  const [openingResume, setOpeningResume] = useState(false)
  const [updatingStage, setUpdatingStage] = useState(false)
  const [emailTemplateStage, setEmailTemplateStage] = useState<CandidateStage>('applied')
  const [sendingCandidateEmail, setSendingCandidateEmail] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false })

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const [candidateRes, notesRes] = await Promise.all([
          supabase.from('candidates').select('*, jobs(title)').eq('id', params.id).single(),
          supabase
            .from('candidate_notes')
            .select('*')
            .eq('candidate_id', params.id)
            .order('created_at', { ascending: false }),
        ])

        if (candidateRes.error) throw candidateRes.error
        if (notesRes.error) throw notesRes.error

        setCandidate(candidateRes.data as CandidateProfile)
        setNotes((notesRes.data ?? []) as CandidateNoteRecord[])
      } catch (error: unknown) {
        setToast({ open: true, type: 'error', message: getErrorMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [params.id, supabase])

  useEffect(() => {
    if (!candidate) return
    setEmailTemplateStage(normalizeCandidateStage(candidate.status))
  }, [candidate])

  const handleStageChange = async (stage: CandidateStage) => {
    if (!candidate) return

    setUpdatingStage(true)

    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage }),
      })

      const payload = (await response.json().catch(() => null)) as {
        candidate?: CandidateProfile
        error?: string
      } | null

      if (!response.ok || !payload?.candidate) {
        throw new Error(payload?.error ?? 'Could not update candidate stage.')
      }

      setCandidate(payload.candidate as CandidateProfile)
      setEmailTemplateStage(stage)
      setToast({ open: true, type: 'success', message: `Candidate moved to ${stage}.` })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setUpdatingStage(false)
    }
  }

  const handleAddNote = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!candidate || !newNote.trim()) return

    setSubmittingNote(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('candidate_notes')
        .insert([
          {
            candidate_id: params.id,
            workspace_id: candidate.workspace_id ?? null,
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
            content: newNote.trim(),
          },
        ])
        .select('*')
        .single()

      if (error) throw error

      setNotes((previous) => [data as CandidateNoteRecord, ...previous])
      setNewNote('')
      setToast({ open: true, type: 'success', message: 'Note added.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setSubmittingNote(false)
    }
  }

  const openOriginalResume = async () => {
    if (!candidate?.resume_file_path) {
      setToast({ open: true, type: 'error', message: 'No original resume was uploaded for this candidate.' })
      return
    }

    setOpeningResume(true)

    try {
      const response = await fetch('/api/candidates/resume-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      })

      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Could not create secure resume link.')
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setOpeningResume(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </AppShell>
    )
  }

  if (!candidate) {
    return (
      <AppShell>
        <Card className="p-8 text-center">
          <div className="text-xl font-black text-slate-900">Candidate not found.</div>
          <div className="mt-2 text-sm font-semibold text-slate-500">
            The profile may have been deleted or is no longer accessible in this workspace.
          </div>
          <div className="mt-6">
            <Link
              href="/admin/candidates"
              className="inline-flex items-center gap-2 rounded-[10px] bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Back to candidates
            </Link>
          </div>
        </Card>
      </AppShell>
    )
  }

  const stage = PIPELINE_STAGES.find((option) => option.id === normalizeCandidateStage(candidate.status))!
  const skills = safeArray(candidate.skills)
  const redFlags = safeArray(candidate.red_flags)
  const interviewQuestions = (candidate.interview_questions ?? '')
    .split('\n')
    .map((question) => question.trim())
    .filter(Boolean)
  const emailDraft = buildCandidateStatusEmail({
    candidateName: candidate.full_name || 'there',
    jobTitle: candidate.jobs?.title || 'the role',
    companyName: workspace?.name || 'our team',
    stage: emailTemplateStage,
  })
  const candidateEmailHref = candidate.email
    ? buildMailtoHref(candidate.email, emailDraft.subject, emailDraft.body)
    : null

  const copyEmailDraft = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`)
      setToast({ open: true, type: 'success', message: 'Email draft copied.' })
    } catch {
      setToast({ open: true, type: 'error', message: 'Could not copy email draft.' })
    }
  }

  const sendCandidateEmail = async () => {
    if (!candidate?.email) {
      setToast({ open: true, type: 'error', message: 'This candidate does not have an email address yet.' })
      return
    }

    setSendingCandidateEmail(true)

    try {
      const response = await fetch('/api/communications/candidate-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          stage: emailTemplateStage,
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        error?: string
        note?: CandidateNoteRecord | null
      } | null

      if (!response.ok) {
        if (payload?.error?.includes('Email delivery is not configured') && candidateEmailHref) {
          window.location.href = candidateEmailHref
          setToast({
            open: true,
            type: 'success',
            message: 'Email draft opened. Send it from your email client to share the update.',
          })
          return
        }

        throw new Error(payload?.error ?? 'Could not send candidate email.')
      }

      if (payload?.note) {
        setNotes((previous) => [payload.note as CandidateNoteRecord, ...previous])
      }

      setToast({ open: true, type: 'success', message: 'Candidate email sent successfully.' })
    } catch (error: unknown) {
      setToast({ open: true, type: 'error', message: getErrorMessage(error) })
    } finally {
      setSendingCandidateEmail(false)
    }
  }

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      <section className="rounded-[14px] border border-slate-200 bg-[linear-gradient(135deg,_#07111f_0%,_#0f2746_45%,_#114f69_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(3,7,18,0.18)] md:px-7 md:py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/candidates"
              className="inline-flex items-center gap-2 rounded-[999px] border border-white/12 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/15"
            >
              <ArrowLeft size={14} />
              Back to candidates
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={`rounded-[999px] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${stage.badgeClassName}`}>
                {stage.label}
              </span>
              <span className="rounded-[999px] border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-100">
                {candidate.seniority || 'Seniority pending'}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              {candidate.full_name || 'Unnamed candidate'}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-200">
              <span className="inline-flex items-center gap-2">
                <Mail size={15} />
                {candidate.email || 'No email available'}
              </span>
              <span className="inline-flex items-center gap-2">
                <UserRound size={15} />
                {candidate.jobs?.title || 'Unassigned job'}
              </span>
              {candidate.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} />
                  {candidate.location}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className={`rounded-[12px] px-5 py-5 text-center ${getScoreTone(candidate.score)}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.18em]">Match score</div>
              <div className="mt-2 text-4xl font-black">{candidate.score ?? '--'}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.16em]">
                {getScoreLabel(candidate.score)}
              </div>
            </div>

            <div className="rounded-[12px] border border-white/12 bg-white/10 px-5 py-5">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">Stage control</div>
              <select
                value={normalizeCandidateStage(candidate.status)}
                onChange={(event) => handleStageChange(event.target.value as CandidateStage)}
                disabled={updatingStage}
                className="mt-3 w-full rounded-[10px] border border-white/12 bg-white/10 px-3 py-3 text-sm font-semibold text-white outline-none transition"
              >
                {PIPELINE_STAGES.map((option) => (
                  <option key={option.id} value={option.id} className="text-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={openOriginalResume}
              disabled={openingResume}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/10 px-5 py-4 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {openingResume ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Open CV
            </button>

            <div className="rounded-[12px] border border-white/12 bg-white/10 px-5 py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                Processing state
              </div>
              <div className="mt-2 text-lg font-black text-white">{candidate.processing_status || 'Not processed'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            <Sparkles size={14} />
            AI assessment
          </div>
          <div className="mt-4 rounded-[12px] bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
              <BrainCircuit size={14} />
              Executive summary
            </div>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-100">
              {candidate.summary || 'AI has not generated a screening summary for this profile yet.'}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-[12px] border border-emerald-100 bg-emerald-50/70 p-5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                <CheckCircle2 size={14} />
                Skills surfaced
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <div className="text-sm font-semibold text-emerald-800/80">No structured skills yet.</div>
                ) : (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-[999px] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-rose-100 bg-rose-50/70 p-5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                <ShieldAlert size={14} />
                Risk signals
              </div>
              <div className="mt-4 space-y-3">
                {redFlags.length === 0 ? (
                  <div className="text-sm font-semibold text-rose-800/80">
                    No explicit red flags were returned by the model.
                  </div>
                ) : (
                  redFlags.map((flag, index) => (
                    <div key={`${flag}-${index}`} className="rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-rose-800 shadow-sm">
                      {flag}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Candidate profile</div>
          <div className="mt-5 space-y-3">
            <MetaItem label="Job" value={candidate.jobs?.title || 'Not linked to a job'} />
            <MetaItem label="Seniority" value={candidate.seniority || 'Not extracted yet'} />
            <MetaItem label="Source" value={candidate.source || candidate.source_filename || 'Unknown'} />
            <MetaItem label="Availability" value={candidate.availability || 'Not provided'} />
            <MetaItem label="Salary expectation" value={candidate.salary_expectation || 'Not provided'} />
            <MetaItem label="Created" value={new Date(candidate.created_at).toLocaleDateString()} />
          </div>

          <div className="mt-6 rounded-[12px] bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              <Clock3 size={14} />
              Interview prompts
            </div>
            <div className="mt-4 space-y-3">
              {interviewQuestions.length === 0 ? (
                <div className="text-sm font-semibold text-slate-500">No interview prompts generated yet.</div>
              ) : (
                interviewQuestions.map((question, index) => (
                  <div key={`${question}-${index}`} className="rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                    {question}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 rounded-[12px] border border-blue-100 bg-blue-50/70 p-5">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              <Mail size={14} />
              Candidate outreach
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
              Prepare a clean status update email based on the candidate&apos;s current pipeline stage.
            </p>

            <select
              value={emailTemplateStage}
              onChange={(event) => setEmailTemplateStage(event.target.value as CandidateStage)}
              className="mt-4 w-full rounded-[10px] border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-900"
            >
              {PIPELINE_STAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="mt-4 rounded-[10px] border border-blue-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Subject</div>
              <div className="mt-2 text-sm font-black text-slate-950">{emailDraft.subject}</div>
              <div className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-600">
                {emailDraft.body}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendCandidateEmail}
                disabled={sendingCandidateEmail || !candidate.email}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingCandidateEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendingCandidateEmail ? 'Sending email...' : 'Send email now'}
              </button>

              <Link
                href={candidateEmailHref || '#'}
                onClick={(event) => {
                  if (!candidateEmailHref) {
                    event.preventDefault()
                    setToast({ open: true, type: 'error', message: 'This candidate does not have an email address yet.' })
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Mail size={16} />
                Open email draft
              </Link>

              <button
                type="button"
                onClick={copyEmailDraft}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Copy size={16} />
                Copy message
              </button>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            <MessageSquare size={14} />
            Internal notes
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handleAddNote} className="rounded-[12px] bg-slate-50 p-5">
              <div className="text-lg font-black tracking-tight text-slate-900">Add context for the hiring team</div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                Capture interview impressions, concerns, or evidence for your next stage decision.
              </p>

              <textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Write a structured note for the team..."
                rows={8}
                className="mt-4 w-full resize-none rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:border-slate-900"
              />

              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submittingNote ? 'Saving note...' : 'Save note'}
              </button>
            </form>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-500">
                  No internal notes yet. Start documenting the review so the decision trail stays visible.
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-900">
                        {note.user_email ? note.user_email.split('@')[0] : 'Team member'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">{new Date(note.created_at).toLocaleString()}</div>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[10px] border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="max-w-[60%] text-right text-sm font-semibold text-slate-700">{value}</div>
    </div>
  )
}
