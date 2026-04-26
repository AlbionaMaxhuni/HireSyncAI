'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, UploadCloud } from 'lucide-react'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Could not submit your application.'
}

export default function ApplicationPanel({
  jobId,
  focusOnMount = false,
  isAuthenticated,
  hasApplied,
  defaultName,
  defaultEmail,
}: {
  jobId: string
  focusOnMount?: boolean
  isAuthenticated: boolean
  hasApplied: boolean
  defaultName?: string
  defaultEmail?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fullName, setFullName] = useState(defaultName ?? '')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(hasApplied)
  const [error, setError] = useState('')
  const [jobTitle, setJobTitle] = useState('')

  useEffect(() => {
    if (!focusOnMount || !containerRef.current) return
    containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusOnMount])

  const loginHref = `/login?next=${encodeURIComponent(`/jobs/${jobId}?apply=1`)}`
  const applySteps = [
    'Review the role and make sure it fits.',
    'Sign in only when you are ready to apply.',
    'Upload your CV and track the status later from your account.',
  ]
  const formChecklist = [
    'Your full name and email',
    'A PDF or DOCX CV up to 5 MB',
    'Optional note only if it adds useful context',
  ]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!resume) {
      setError('Please upload your CV before submitting.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('jobId', jobId)
      formData.append('fullName', fullName.trim())
      formData.append('email', email.trim())
      formData.append('location', location.trim())
      formData.append('note', note.trim())
      formData.append('resume', resume)

      const response = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as { error?: string; jobTitle?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Could not submit your application.')
      }

      setSubmitted(true)
      setJobTitle(payload?.jobTitle ?? '')
      setResume(null)
      setNote('')
    } catch (submissionError: unknown) {
      setError(getErrorMessage(submissionError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={containerRef} className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-6">
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Application</div>

      {submitted ? (
        <div className="mt-4 rounded-[12px] bg-emerald-50 p-5 text-emerald-900">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            <CheckCircle2 size={16} />
            Submitted
          </div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-emerald-900/85">
            Your application{jobTitle ? ` for ${jobTitle}` : ''} is now in the pipeline. You can track it from your
            applications page.
          </p>
          <Link
            href="/applications"
            className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            View my applications
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-950">How applying works</div>
            <div className="mt-3 space-y-2">
              {applySteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-3 text-sm font-bold leading-relaxed text-slate-800"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-amber-200">
              <LockKeyhole size={16} />
              Sign in required
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed text-white">
              You can review the role freely. We only ask you to sign in when you are ready to apply.
            </p>
            <Link
              href={loginHref}
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"
            >
              Sign in to apply
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm font-semibold leading-relaxed text-slate-600">
            Keep this simple. Add only the information the hiring team actually needs to review you clearly.
          </p>

          <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-950">What to prepare</div>
            <div className="mt-3 space-y-2">
              {formChecklist.map((item) => (
                <div key={item} className="text-sm font-semibold leading-relaxed text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Full name</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              className="mt-2 w-full rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="name@email.com"
              className="mt-2 w-full rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Location</label>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City or country"
              className="mt-2 w-full rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Optional note
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Add a short note about availability, portfolio, or what makes you a strong fit."
              className="mt-2 w-full resize-none rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <UploadCloud size={16} className="text-amber-700" />
              Upload your CV
            </div>
            <label className="mt-4 flex cursor-pointer flex-col gap-2 rounded-[10px] bg-white px-4 py-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
              <span>{resume ? resume.name : 'Choose a PDF or DOCX file'}</span>
              <span className="text-xs text-slate-400">PDF or DOCX only, maximum 5 MB</span>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => setResume(event.target.files?.[0] ?? null)}
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {submitting ? 'Submitting application...' : 'Submit application'}
          </button>
        </form>
      )}
    </div>
  )
}
