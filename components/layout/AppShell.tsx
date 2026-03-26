'use client'

import type { ReactNode } from 'react'
import { Sparkles, LayoutDashboard, MessageSquare, Users, Settings } from 'lucide-react'

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Conversations', icon: MessageSquare, href: '/' },
  { label: 'Candidates (soon)', icon: Users, href: '#' },
  { label: 'Settings (soon)', icon: Settings, href: '#' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-6 md:block md:h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={18} />
            </div>
            <div className="font-black tracking-tight">
              HireSync<span className="text-blue-600">AI</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Icon size={16} className="text-slate-400" />
                  {item.label}
                </a>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              How it works
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              Type a role title → get 5 interview questions → saved privately per user (RLS).
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Next: streaming + candidate scoring.
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}