'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, LayoutDashboard, Briefcase, Users, type LucideIcon } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const nav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { label: 'Candidates', icon: Users, href: '/candidates' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={18} />
            </div>
            <div className="font-black tracking-tight">
              HireSync<span className="text-blue-600">AI</span>
            </div>
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Workspace
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-6 md:block md:h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={18} />
            </div>

            <div className="min-w-0">
              <div className="truncate font-black tracking-tight">
                HireSync<span className="text-blue-600">AI</span>
              </div>
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Recruiter workspace
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    active
                      ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-600/5'
                      : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Icon
                    size={16}
                    className={[
                      'transition',
                      active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                    ].join(' ')}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Quick flow
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              Create a job → add candidates → run AI analysis → review ranking.
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Mobile: use bottom navigation.
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 pb-24 md:pb-0">
          <div className="rounded-3xl border border-slate-200 bg-white/60 p-3 shadow-sm shadow-slate-900/5 backdrop-blur md:p-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-around px-4 py-3">
          {nav.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-black transition',
                  active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
