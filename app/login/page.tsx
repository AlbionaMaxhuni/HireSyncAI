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
import {
  getAuthIntent,
  getPasswordChecklist,
  getPasswordValidationMessage,
  getSafeNextPath,
  type AuthIntent,
} from '@/lib/auth-flow'
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null)
  const [sessionUserName, setSessionUserName] = useState<string | null>(null)
  const [switchingAccount, setSwitchingAccount] = useState(false)

  const message = searchParams.get('message')
  const requestedPath = searchParams.get('next')
  const nextPath = getSafeNextPath(requestedPath, '/auth/complete')
  const intent = getAuthIntent(nextPath)
  const joiningWorkspace = intent === 'invite'
  const compactSignup = mode === 'signup'

  const passwordChecklist = useMemo(() => getPasswordChecklist(password), [password])

  const intentCopy = useMemo(() => getIntentCopy(intent), [intent])
  const sideGuide = useMemo(() => getIntentGuide(intent), [intent])

  const urlNotice = useMemo(() => {
    if (message === 'logged_out') return 'You have logged out successfully.'
    if (message === 'auth_required') return 'Please sign in to continue to the page you requested.'
    if (message === 'password_updated') return 'Password updated successfully. You can sign in with your new password.'
    if (joiningWorkspace) return 'Use the same email address that received the invite to join this team workspace.'
    return ''
  }, [joiningWorkspace, message])

  const headerText = useMemo(() => {
    if (mode === 'signup') {
      return {
        eyebrow: intentCopy.signupEyebrow,
        title: intentCopy.signupTitle,
        subtitle: intentCopy.signupSubtitle,
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
      eyebrow: intentCopy.loginEyebrow,
      title: intentCopy.loginTitle,
      subtitle: intentCopy.loginSubtitle,
    }
  }, [intentCopy, mode])

  const sessionDisplayName = sessionUserName || sessionUserEmail || 'HireSync user'
  const sessionInitials = getInitials(sessionDisplayName)
  const showSessionCard = Boolean(sessionUserEmail)

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

  const handleReset = async (event: FormEvent) => {
    event.preventDefault()

    setLoading(true)
    setError('')
    setNotice('')

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
      const passwordError = getPasswordValidationMessage(password, confirmPassword)

      if (!name.trim()) {
        setError('Full name is required.')
        setLoading(false)
        return
      }

      if (passwordError) {
        setError(passwordError)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/complete?next=${encodeURIComponent(nextPath)}`,
          data: { full_name: name.trim() },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        if (data.session) {
          router.replace(nextPath)
        } else {
          setNotice('Account created. Check your email to verify your account and continue.')
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        router.replace(nextPath)
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(180,83,9,0.08),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f8_100%)] px-2 py-2 text-slate-900 md:px-3 md:py-3">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] w-full max-w-[1440px] overflow-hidden rounded-[24px] border border-white/80 bg-white/74 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur-xl xl:grid-cols-2">
        <section className="relative overflow-hidden bg-[linear-gradient(150deg,_#07111f_0%,_#10233e_52%,_#0f766e_100%)] px-5 py-7 text-white md:px-8 md:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_32%)]" />

          <div className="relative z-10 flex h-full flex-col">
            <Logo theme="dark" />

            <div className="mt-9 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles size={12} />
                {intentCopy.heroBadge}
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-[46px]">
                {intentCopy.heroTitle}
              </h1>
              <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-slate-200 md:text-base">
                {intentCopy.heroBody}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
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

            <div className="mt-6 rounded-[14px] border border-white/12 bg-white/10 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">
                {sideGuide.eyebrow}
              </div>
              <div className="mt-3 text-lg font-black text-white">{sideGuide.title}</div>
              <div className="mt-4 space-y-3">
                {sideGuide.steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-[10px] border border-white/10 bg-white/8 px-3 py-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/14 text-[11px] font-black text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold leading-relaxed text-slate-200">{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <div className="w-full max-w-[500px]">
            <div className="mb-5 xl:hidden">
              <Logo />
            </div>

            <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {headerText.eyebrow}
                  </div>
                  <h2 className={compactSignup ? 'mt-1.5 text-[30px] font-black tracking-tight text-slate-900' : 'mt-2 text-3xl font-black tracking-tight text-slate-900'}>
                    {headerText.title}
                  </h2>
                  <p className={compactSignup ? 'mt-1 text-[13px] font-semibold leading-relaxed text-slate-500' : 'mt-1.5 text-sm font-semibold leading-relaxed text-slate-500'}>
                    {headerText.subtitle}
                  </p>
                </div>
                <div className="rounded-[10px] bg-slate-950 p-3 text-white">
                  <ShieldCheck size={20} />
                </div>
              </div>

              {mode !== 'forgot' && !showSessionCard && (
                <div className={compactSignup ? 'mt-4 grid grid-cols-2 rounded-[12px] bg-slate-100 p-1' : 'mt-5 grid grid-cols-2 rounded-[12px] bg-slate-100 p-1'}>
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

              <div className={compactSignup ? 'mt-4 space-y-3' : 'mt-5 space-y-3.5'}>
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
                  <div className="flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-10 text-sm font-semibold text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Checking your current session...
                  </div>
                ) : showSessionCard ? (
                  <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-gradient-to-br from-slate-900 via-blue-700 to-cyan-500 text-sm font-black text-white shadow-lg shadow-blue-100">
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

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.push(nextPath)}
                        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        Continue
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={signOutExistingSession}
                        disabled={switchingAccount}
                        className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {switchingAccount ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} />}
                        Log out and switch
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={mode === 'forgot' ? handleReset : handleAuth} className={compactSignup ? 'space-y-3' : 'space-y-3.5'}>
                    {mode === 'signup' && (
                      <Field icon={User} label="Full name">
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

                    <Field icon={Mail} label="Email">
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
                      <Field icon={Lock} label="Password">
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

                    {mode === 'signup' && (
                      <>
                        <Field icon={Lock} label="Confirm password">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Confirm password"
                            autoComplete="new-password"
                            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                            minLength={8}
                            required
                          />
                        </Field>

                        <PasswordChecklist
                          compact={compactSignup}
                          items={[
                            {
                              label: `At least 8 characters`,
                              complete: passwordChecklist.minLength,
                            },
                            {
                              label: 'At least one letter',
                              complete: passwordChecklist.letter,
                            },
                            {
                              label: 'At least one number',
                              complete: passwordChecklist.number,
                            },
                          ]}
                        />
                      </>
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

              {!compactSignup && (
                <>
                  <div className="mt-5 rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-[10px] bg-white p-2 text-slate-900 shadow-sm">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{intentCopy.helperTitle}</div>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                          {intentCopy.helperBody}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5 text-center">
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
                </>
              )}
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
        'rounded-[10px] px-4 py-3 text-sm font-black transition',
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
  label,
}: {
  children: ReactNode
  icon: LucideIcon
  label: string
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-3.5 transition focus-within:border-slate-900 focus-within:bg-white">
        <Icon size={18} className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </label>
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
        'flex items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-semibold',
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
    <div className="rounded-[14px] border border-white/12 bg-white/10 p-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/12 text-white">
        <Icon size={18} />
      </div>
      <div className="mt-3 text-lg font-black text-white">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">{text}</p>
    </div>
  )
}

function PasswordChecklist({
  items,
  compact = false,
}: {
  items: Array<{ label: string; complete: boolean }>
  compact?: boolean
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Password rules</div>
      {compact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-[999px] border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
            >
              <CheckCircle2 size={12} className={item.complete ? 'text-emerald-600' : 'text-slate-300'} />
              {item.label}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <CheckCircle2 size={14} className={item.complete ? 'text-emerald-600' : 'text-slate-300'} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getIntentCopy(intent: AuthIntent) {
  if (intent === 'apply') {
    return {
      heroBadge: 'Candidate application',
      heroTitle: 'Sign in only when you are ready to apply.',
      heroBody:
        'Candidates can read the role first, then create an account only when they want to submit an application and track progress.',
      loginEyebrow: 'Apply securely',
      loginTitle: 'Sign in to continue your application',
      loginSubtitle: 'Access should feel calm and clear for candidates, not like a barrier before they even understand the role.',
      signupEyebrow: 'Create candidate access',
      signupTitle: 'Create account',
      signupSubtitle: 'Use one account to apply and track your application status.',
      helperTitle: 'Why sign in here',
      helperBody:
        'Sign in is only required for applying and tracking your status. Open roles remain public so candidates can explore first.',
    }
  }

  if (intent === 'invite') {
    return {
      heroBadge: 'Workspace invite',
      heroTitle: 'Join your hiring team workspace securely.',
      heroBody:
        'Team invites should feel simple and trustworthy. Sign in or create an account with the invited email address to join the workspace.',
      loginEyebrow: 'Team access',
      loginTitle: 'Sign in to join the workspace',
      loginSubtitle: 'Use the invited email address so the workspace can attach your account to the team correctly.',
      signupEyebrow: 'Create team access',
      signupTitle: 'Create account',
      signupSubtitle: 'Your invite will connect this account to the workspace automatically.',
      helperTitle: 'Invite flow',
      helperBody:
        'Team members should not need manual setup. The workspace invite connects the account after sign in or sign up with the correct email.',
    }
  }

  if (intent === 'workspace') {
    return {
      heroBadge: 'Admin workspace',
      heroTitle: 'A professional front door for the hiring workspace.',
      heroBody:
        'Recruiters and hiring teams enter the private workspace only when they need to manage jobs, candidates, and team access.',
      loginEyebrow: 'Workspace access',
      loginTitle: 'Sign in to HireSync AI',
      loginSubtitle: 'Continue to your private hiring workspace with one focused, secure login flow.',
      signupEyebrow: 'Create workspace access',
      signupTitle: 'Create account',
      signupSubtitle: 'Use one clean entry point for workspace access and recruiting collaboration.',
      helperTitle: 'Workspace access',
      helperBody:
        'The hiring workspace stays private while the public job portal remains simple for candidates.',
    }
  }

  return {
    heroBadge: 'Cleaner product entry',
    heroTitle: 'A cleaner front door for the hiring workspace.',
    heroBody:
      'Candidates can review roles calmly, and the team enters the private workspace only when needed. The result feels simpler, more real, and more professional.',
    loginEyebrow: 'Secure access',
    loginTitle: 'Sign in to HireSync AI',
    loginSubtitle: 'A simple, professional sign-in flow for the public portal and the private hiring workspace.',
    signupEyebrow: 'Create access',
    signupTitle: 'Create account',
    signupSubtitle: 'Use one clean entry point for applications and hiring workspace access.',
    helperTitle: 'Simple entry flow',
    helperBody:
      'Open roles remain public. Sign in is only for applying, tracking applications, or entering the hiring workspace.',
  }
}

function getIntentGuide(intent: AuthIntent) {
  if (intent === 'apply') {
    return {
      eyebrow: 'After sign in',
      title: 'Finish the application clearly.',
      steps: [
        'Return to the role page and complete the application form.',
        'Upload your CV and send the application in one simple step.',
        'Track the status later from your applications page.',
      ],
    }
  }

  if (intent === 'invite') {
    return {
      eyebrow: 'After sign in',
      title: 'Join the workspace with the invited email.',
      steps: [
        'The system checks that the account email matches the invite.',
        'Once accepted, the workspace access is attached automatically.',
        'You land inside the hiring team workspace without manual setup.',
      ],
    }
  }

  if (intent === 'workspace') {
    return {
      eyebrow: 'After sign in',
      title: 'Use the workspace in three steps.',
      steps: [
        'Open Jobs and create or publish a role.',
        'Review candidates, process CVs, and move strong profiles forward.',
        'Invite teammates only when the workspace is ready to share.',
      ],
    }
  }

  return {
    eyebrow: 'After sign in',
    title: 'Keep the next step obvious.',
    steps: [
      'Candidates continue to roles and applications.',
      'Hiring teams continue to the private workspace.',
      'The goal is to keep the first action clear, not crowded.',
    ],
  }
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
