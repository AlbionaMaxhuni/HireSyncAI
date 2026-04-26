'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserPlus,
  Settings,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  House,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import Logo from '@/components/branding/Logo'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { getUserDisplayName } from '@/lib/auth'
import { formatWorkspaceRole } from '@/lib/workspace'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const primaryNav: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '/admin' },
  { label: 'Jobs', icon: Briefcase, href: '/admin/jobs' },
  { label: 'Candidates', icon: Users, href: '/admin/candidates' },
  { label: 'Team', icon: UserPlus, href: '/admin/team' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
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

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const { user, workspace } = useAuth()
  const { t } = useLanguage()

  const fullName = getUserDisplayName(user, 'Hiring Team')
  const email = user?.email ?? 'workspace@hiresync.ai'
  const initials = getInitials(fullName)
  const workspaceName = workspace?.name || 'Hiring workspace'
  const workspaceRole = formatWorkspaceRole(workspace?.membershipRole)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login?message=logged_out')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <div className="px-3">
          <Logo />
        </div>

        <div className="mt-4 px-3">
          <LanguageSwitcher />
        </div>

        <div className="mt-6 border-y border-slate-200 py-4">
          <div className="flex items-center gap-3 px-3">
            <ShieldCheck size={16} className="text-slate-400" />
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-slate-900">{workspaceName}</div>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Hiring workspace</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <details className="group mt-auto">
          <summary className="list-none cursor-pointer rounded-[10px] border border-slate-200 bg-white p-3 transition hover:border-slate-300">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-gradient-to-br from-slate-900 via-blue-700 to-cyan-500 text-sm font-black text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-900">{fullName}</div>
                <div className="truncate text-xs font-semibold text-slate-500">{email}</div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>

            <div className="mt-3 flex items-center justify-between rounded-[8px] bg-slate-50 px-3 py-2.5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Workspace access
                </div>
                <div className="mt-1 text-sm font-black text-slate-900">{t(`${workspaceRole} session active`)}</div>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Live
              </div>
            </div>
          </summary>

          <div className="mt-3 rounded-[10px] border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <House size={16} className="text-slate-400" />
              Public portal
            </Link>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-black text-amber-900 transition hover:bg-amber-50"
            >
              <LogOut size={16} className="text-amber-700" />
              Log out
            </button>
          </div>
        </details>
      </aside>

      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/85 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <div className="text-sm font-black text-slate-900">{workspaceName}</div>
              <div className="text-[11px] font-semibold text-slate-500">{t(`${workspaceRole} session active`)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-slate-900 via-blue-700 to-cyan-500 text-[11px] font-black text-white">
                  {initials}
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </summary>

              <div className="absolute right-0 top-full mt-3 hidden w-72 rounded-[10px] border border-white/80 bg-white/96 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl group-open:block">
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Account</div>
                  <div className="mt-2 text-base font-black text-slate-900">{fullName}</div>
                  <div className="mt-1 break-all text-sm font-semibold text-slate-500">{email}</div>
                </div>

                <div className="mt-2 space-y-1">
                  <Link
                    href="/"
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <House size={16} className="text-slate-400" />
                    Public portal
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-black text-amber-900 transition hover:bg-amber-50"
                  >
                    <LogOut size={16} className="text-amber-700" />
                    Log out
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="md:pl-[248px]">
        <div className="w-full p-4 pb-24 md:p-6">
          <div className="mx-auto max-w-[1680px]">
            {children}
          </div>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/80 bg-white/92 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-6 gap-1">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex flex-col items-center justify-center rounded-[10px] px-2 py-2 text-[10px] font-black transition',
                  active ? 'bg-slate-900 text-white' : 'text-slate-500',
                ].join(' ')}
              >
                <Icon size={16} />
                <span className="mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={[
        'group flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-sm font-black transition-all',
        active
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon
        size={18}
        className={active ? 'text-white' : 'text-slate-400 transition group-hover:text-slate-700'}
      />
      {item.label}
    </Link>
  )
}
