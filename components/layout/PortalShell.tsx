'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  FileStack,
  LayoutDashboard,
  LogOut,
} from 'lucide-react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import Logo from '@/components/branding/Logo'
import { useAuth } from '@/context/AuthContext'
import { getUserDisplayName } from '@/lib/auth'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return 'HS'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

const accountActionClassName =
  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50'

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, role: userRole, loading } = useAuth()
  const displayName = getUserDisplayName(user, 'HireSync user')
  const initials = getInitials(displayName)

  const navItems = [
    { label: 'Open roles', href: '/jobs', icon: BriefcaseBusiness },
    ...(user ? [{ label: 'My applications', href: '/applications', icon: FileStack }] : []),
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(194,65,12,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(180deg,_#fffdf8_0%,_#f4efe6_46%,_#ebe5da_100%)] text-slate-950">
      <div className="w-full px-3 pb-8 pt-3 md:px-4 md:pt-4">
        <header className="sticky top-3 z-40 rounded-[14px] border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="w-fit">
                <Logo />
              </Link>

              {!loading && user && (
                <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 sm:inline-flex">
                  Signed in
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
              <nav className="flex flex-wrap items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(pathname, item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        'inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-black transition',
                        active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                <LanguageSwitcher compact />

                {loading ? (
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-400">
                    Checking session...
                  </div>
                ) : user ? (
                  <>
                    {userRole === 'admin' && (
                      <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Workspace
                        <ArrowUpRight size={15} />
                      </Link>
                    )}

                    <details className="group relative">
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-slate-900 via-blue-700 to-cyan-500 text-xs font-black text-white">
                          {initials}
                        </div>
                        <div className="hidden min-w-0 text-left sm:block">
                          <div className="max-w-[140px] truncate text-sm font-black text-slate-900">
                            {displayName}
                          </div>
                          <div className="max-w-[140px] truncate text-[11px] font-semibold text-slate-500">
                            {userRole === 'admin' ? 'Recruiting team' : 'Candidate account'}
                          </div>
                        </div>
                        <ChevronDown size={16} className="text-slate-400" />
                      </summary>

                      <div className="absolute right-0 top-full mt-3 hidden w-[290px] rounded-[14px] border border-slate-200 bg-white p-2 shadow-[0_24px_80px_rgba(15,23,42,0.14)] group-open:block">
                        <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Account
                          </div>
                          <div className="mt-2 text-base font-black text-slate-900">{displayName}</div>
                          <div className="mt-1 break-all text-sm font-semibold text-slate-500">{user.email}</div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <Link href="/applications" className={accountActionClassName}>
                            <FileStack size={16} className="text-slate-400" />
                            My applications
                          </Link>

                          {userRole === 'admin' && (
                            <Link href="/admin" className={accountActionClassName}>
                              <LayoutDashboard size={16} className="text-slate-400" />
                              Admin workspace
                            </Link>
                          )}

                          <Link
                            href="/logout"
                            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-black text-amber-900 transition hover:bg-amber-50"
                          >
                            <LogOut size={16} className="text-amber-700" />
                            Log out
                          </Link>
                        </div>
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/jobs"
                      className="inline-flex items-center gap-2 rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      Explore jobs
                      <ArrowUpRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-6">{children}</main>

        <footer className="mt-6 rounded-[14px] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>HireSync AI keeps hiring clear for teams and simple for candidates.</div>
            <div className="flex flex-wrap items-center gap-3">
              <span>Public jobs, guided applications, and a focused admin workspace.</span>
              <Link href="/privacy" className="font-black text-slate-700 transition hover:text-slate-950">
                Privacy
              </Link>
              <Link href="/terms" className="font-black text-slate-700 transition hover:text-slate-950">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
