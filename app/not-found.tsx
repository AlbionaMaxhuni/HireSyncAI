import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'

export default function NotFoundPage() {
  return (
    <PortalShell>
      <div className="rounded-[40px] border border-white/70 bg-white/80 p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Not found</div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">That page is not available.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
          The role may have been removed, or the link no longer points to an active page in the workspace.
        </p>
        <Link
          href="/jobs"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Back to open roles
        </Link>
      </div>
    </PortalShell>
  )
}
