'use client'

import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { getUserDisplayName } from '@/lib/auth'
import { createClient } from '@/utils/supabase/client'

type AuthMode = 'login' | 'signup' | 'forgot'

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return 'HS'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function AuthContent() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null)
  const [sessionUserName, setSessionUserName] = useState<string | null>(null)
  const [switchingAccount, setSwitchingAccount] = useState(false)

  const authRequired = searchParams.get('message') === 'auth_required'
  const logoutMode = searchParams.get('method') === 'logout'
  const requestedPath = searchParams.get('next')?.trim()
  const nextPath =
    requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/auth/complete'
  const joiningWorkspace = nextPath.includes('/auth/complete?invite=')

  const urlNotice = useMemo(() => {
    if (logoutMode) return 'You have logged out successfully.'
    if (authRequired) return 'Please sign in to continue to the page you requested.'
    if (joiningWorkspace) return 'Sign in or create an account to join your team workspace.'
    return ''
  }, [authRequired, joiningWorkspace, logoutMode])

  const headerText = useMemo(() => {
    if (mode === 'signup') {
      return {
        eyebrow: 'Create access',
        title: 'Create your HireSync account',
        subtitle: 'Use one clean entry point for candidate applications and recruiting team access.',
      }
    }

    if (mode === 'forgot') {
      return {
        eyebrow: 'Password reset',
        title: 'Reset your password',
        subtitle: 'We will send you a secure link so you can get back into the workspace quickly.',
      }
    }

    return {
      eyebrow: 'Secure access',
      title: 'Sign in to HireSync AI',
      subtitle: 'A simple, professional sign-in flow for the public portal and the private hiring workspace.',
    }
  }, [mode])

  const sessionDisplayName = sessionUserName || sessionUserEmail || 'HireSync user'
  const sessionInitials = getInitials(sessionDisplayName)
  const showSessionCard = Boolean(sessionUserEmail) && mode === 'login'

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setSessionUserEmail(user?.email ?? null)
      setSessionUserName(user ? getUserDisplayName(user, user.email ?? 'User') : null)
      setCheckingSession(false)
    }

    run()
  }, [supabase])

  useEffect(() => {
    if (logoutMode) {
      window.history.replaceState({}, '', '/login')
    }
  }, [logoutMode])

  const handleReset = async (event: FormEvent) => {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setNotice('Password reset link sent. Check your inbox.')
      setMode('login')
    }

    setLoading(false)
  }

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setNotice('Account created. Please verify your email before signing in.')
        setMode('login')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        router.push(nextPath)
      }
    }

    setLoading(false)
  }

  const signOutExistingSession = async () => {
    setSwitchingAccount(true)
    setError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
    } else {
      setSessionUserEmail(null)
      setSessionUserName(null)
      setNotice('Logged out. You can continue with another account.')
    }

    setSwitchingAccount(false)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(180,83,9,0.08),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f8_100%)] px-4 py-6 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[40px] border border-white/80 bg-white/74 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(150deg,_#07111f_0%,_#10233e_52%,_#0f766e_100%)] px-6 py-8 text-white md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_32%)]" />

          <div className="relative z-10 flex h-full flex-col">
            <Logo theme="dark" />

            <div className="mt-12 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles size={12} />
                Cleaner product entry
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-5xl">
                A cleaner front door for the hiring workspace.
              </h1>
              <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-slate-200 md:text-base">
                Candidates can review roles calmly, and the team enters the private workspace only when needed. The
                result feels simpler, more real, and more professional.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <InfoTile
                icon={BriefcaseBusiness}
                title="Public roles"
                text="Jobs stay visible before login so visitors understand the opportunity first."
              />
              <InfoTile
                icon={BrainCircuit}
                title="Focused review"
                text="Recruiters keep candidates, notes, and AI support in one disciplined workspace."
              />
              <InfoTile
                icon={ShieldCheck}
                title="Secure access"
                text="Authentication starts only when applying or entering the internal admin area."
              />
            </div>

            <div className="mt-8 rounded-[28px] border border-white/12 bg-white/10 p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">
                Better account behavior
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-200">
                Logging out should live under account actions, not be the loudest button in the main navigation. This
                keeps the experience calmer and more credible.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 md:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 xl:hidden">
              <Logo />
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {headerText.eyebrow}
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{headerText.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                    {headerText.subtitle}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950 p-3 text-white">
                  <ShieldCheck size={20} />
                </div>
              </div>

              {mode !== 'forgot' && !showSessionCard && (
                <div className="mt-6 grid grid-cols-2 rounded-[20px] bg-slate-100 p-1">
                  <ModeButton
                    active={mode === 'login'}
                    onClick={() => {
                      setMode('login')
                      setError('')
                      setNotice('')
                    }}
                  >
                    Sign in
                  </ModeButton>
                  <ModeButton
                    active={mode === 'signup'}
                    onClick={() => {
                      setMode('signup')
                      setError('')
                      setNotice('')
                    }}
                  >
                    Create account
                  </ModeButton>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {(notice || urlNotice) && (
                  <Banner tone="info">
                    <CheckCircle2 size={14} />
                    {notice || urlNotice}
                  </Banner>
                )}

                {error && (
                  <Banner tone="error">
                    <AlertCircle size={14} />
                    {error}
                  </Banner>
                )}

                {checkingSession ? (
                  <div className="flex items-center justify-center gap-2 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-sm font-semibold text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Checking your current session...
                  </div>
                ) : showSessionCard ? (
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-slate-900 via-blue-700 to-cyan-500 text-sm font-black text-white shadow-lg shadow-blue-100">
                        {sessionInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Session detected
                        </div>
                        <div className="truncate text-xl font-black text-slate-900">{sessionDisplayName}</div>
                        <div className="truncate text-sm font-semibold text-slate-500">{sessionUserEmail}</div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">
                      You are already logged in. Continue with this account or log out if you want to switch to
                      another one.
                    </p>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.push(nextPath)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        Continue
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={signOutExistingSession}
                        disabled={switchingAccount}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {switchingAccount ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} />}
                        Log out and switch
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={mode === 'forgot' ? handleReset : handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                      <Field icon={User}>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Full name"
                          autoComplete="name"
                          className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                          required
                        />
                      </Field>
                    )}

                    <Field icon={Mail}>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Work email"
                        autoComplete="email"
                        className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                        required
                      />
                    </Field>

                    {mode !== 'forgot' && (
                      <Field icon={Lock}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Password"
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="text-slate-400 transition hover:text-slate-700"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </Field>
                    )}

                    {mode === 'login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot')
                            setError('')
                          }}
                          className="text-xs font-black uppercase tracking-[0.16em] text-blue-700 transition hover:text-slate-900"
                        >
                          Forgot password
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {mode === 'forgot'
                        ? loading
                          ? 'Sending reset link...'
                          : 'Send reset link'
                        : loading
                          ? 'Processing...'
                          : mode === 'signup'
                            ? 'Create account'
                            : 'Sign in'}
                      {!loading && <ChevronRight size={18} />}
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-2 text-slate-900 shadow-sm">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">Simple entry flow</div>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                      Open roles remain public. Sign in is only for applying, tracking applications, or entering the
                      hiring workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6 text-center">
                {showSessionCard ? (
                  <div className="text-sm font-semibold text-slate-500">
                    Use the actions above to continue or switch account.
                  </div>
                ) : mode === 'forgot' ? (
                  <button
                    onClick={() => {
                      setMode('login')
                      setError('')
                    }}
                    className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">
                    Secure authentication for both hiring teams and candidates.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl px-4 py-3 text-sm font-black transition',
        active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Field({
  children,
  icon: Icon,
}: {
  children: ReactNode
  icon: LucideIcon
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition focus-within:border-slate-900 focus-within:bg-white">
      <Icon size={18} className="shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: 'info' | 'error'
  children: ReactNode
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold',
        tone === 'info'
          ? 'border border-emerald-100 bg-emerald-50 text-emerald-800'
          : 'border border-rose-100 bg-rose-50 text-rose-700',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function InfoTile({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <div className="rounded-[26px] border border-white/12 bg-white/10 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white">
        <Icon size={18} />
      </div>
      <div className="mt-4 text-lg font-black text-white">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">{text}</p>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
          Loading authentication...
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
