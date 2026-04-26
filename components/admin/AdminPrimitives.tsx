import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'

export const adminPrimaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800'

export const adminSecondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'

export const adminDangerButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-rose-200 bg-white px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50'

export const adminInputClassName =
  'w-full rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900'

export const adminTextareaClassName =
  'w-full resize-none rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:border-slate-900'

export const adminSelectClassName =
  'rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-900'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f7fbff_100%)] px-5 py-5 shadow-sm md:px-6 md:py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</div>
          <h1 className="mt-2 text-[28px] font-black tracking-tight text-slate-950 md:text-[36px]">{title}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}

export function AdminStatsGrid({ children }: { children: ReactNode }) {
  return <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</section>
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const toneClassName =
    tone === 'accent'
      ? 'bg-blue-50 text-blue-700'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'warning'
          ? 'bg-amber-50 text-amber-700'
          : tone === 'danger'
            ? 'bg-rose-50 text-rose-700'
            : 'bg-slate-950 text-white'

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
          <div className="mt-3 text-[28px] font-black tracking-tight text-slate-950">{value}</div>
          {hint ? <div className="mt-1 text-sm font-semibold text-slate-500">{hint}</div> : null}
        </div>
        <div className={['rounded-[10px] p-3', toneClassName].join(' ')}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}

export function AdminSectionCard({
  eyebrow,
  title,
  description,
  action,
  className = '',
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</div>
          <h2 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <div className="text-lg font-black tracking-tight text-slate-900">{title}</div>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <Card>
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Filters</div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function AdminPill({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const className =
    tone === 'accent'
      ? 'bg-blue-100 text-blue-700'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-700'
        : tone === 'warning'
          ? 'bg-amber-100 text-amber-700'
          : tone === 'danger'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-slate-100 text-slate-600'

  return <span className={['rounded-[999px] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]', className].join(' ')}>{label}</span>
}
