'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { getPasswordChecklist, getPasswordValidationMessage } from '@/lib/auth-flow'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const passwordChecklist = getPasswordChecklist(password)

  useEffect(() => {
    let active = true

    const checkRecovery = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      setRecoveryReady(Boolean(session))
      setCheckingRecovery(false)
    }

    void checkRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setRecoveryReady(Boolean(session))
        setCheckingRecovery(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const validationError = getPasswordValidationMessage(password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      window.setTimeout(() => router.replace('/login?message=password_updated'), 1600)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(180,83,9,0.08),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f8_100%)] px-2 py-2 text-slate-900 md:px-3 md:py-3">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1580px] items-center justify-center overflow-hidden rounded-[24px] border border-white/80 bg-white/74 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="w-full max-w-md px-4 py-6 md:px-8 md:py-7">
          <div className="mb-5">
            <Logo />
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Password reset</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Create a new password</h1>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-500">
              Use a secure password so you can return to the hiring workspace or your applications without friction.
            </p>

            <div className="mt-5 space-y-3.5">
              {checkingRecovery ? (
                <div className="flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-10 text-sm font-semibold text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Preparing your recovery session...
                </div>
              ) : success ? (
                <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                    <CheckCircle2 size={16} />
                    Password updated
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-emerald-900/85">
                    Your password has been updated. We are taking you back to the sign-in page now.
                  </p>
                </div>
              ) : !recoveryReady ? (
                <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                    <AlertCircle size={16} />
                    Recovery link needed
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-amber-900/85">
                    This page works only from a valid password reset email. Request a new reset link if this recovery
                    session has expired.
                  </p>
                  <Link
                    href="/login"
                    className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-amber-700 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-800"
                  >
                    <ArrowLeft size={15} />
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                  {error && (
                    <div className="flex items-center gap-2 rounded-[10px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}

                  <Field label="New password" showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      required
                    />
                  </Field>

                  <Field label="Confirm password">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      required
                    />
                  </Field>

                  <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Password rules</div>
                    <div className="mt-3 space-y-2">
                      <ChecklistRow label="At least 8 characters" complete={passwordChecklist.minLength} />
                      <ChecklistRow label="At least one letter" complete={passwordChecklist.letter} />
                      <ChecklistRow label="At least one number" complete={passwordChecklist.number} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    {loading ? 'Updating password...' : 'Save new password'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft size={16} />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  children,
  label,
  showPassword,
  onToggle,
}: {
  children: React.ReactNode
  label: string
  showPassword?: boolean
  onToggle?: () => void
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3.5 transition focus-within:border-slate-900 focus-within:bg-white">
        <Lock size={18} className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">{children}</div>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="text-slate-400 transition hover:text-slate-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </label>
  )
}

function ChecklistRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      <CheckCircle2 size={14} className={complete ? 'text-emerald-600' : 'text-slate-300'} />
      {label}
    </div>
  )
}
