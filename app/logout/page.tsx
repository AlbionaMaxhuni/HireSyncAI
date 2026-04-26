'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function LogoutPage() {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const run = async () => {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError(signOutError.message)
        return
      }

      setDone(true)
      router.replace('/login?message=logged_out')
    }

    run()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#edf3f8_100%)] px-2 py-3 md:px-3">
      <div className="w-full max-w-md rounded-[20px] border border-white/80 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        {error ? (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle size={42} />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Could not log you out cleanly</h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <LogIn size={16} />
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-white">
              <Loader2 size={34} className="animate-spin" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
              {done ? 'Logged out' : 'Logging you out'}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
              We are clearing your active session and taking you back to the secure login screen.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
