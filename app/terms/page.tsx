import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'

export const metadata = {
  title: 'Terms',
}

export default function TermsPage() {
  return (
    <PortalShell>
      <section className="mx-auto max-w-4xl rounded-[12px] border border-slate-200 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950">
          <ArrowLeft size={16} />
          Back to jobs
        </Link>

        <div className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Terms</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Terms of use</h1>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">
          HireSync AI is a hiring workflow tool for organizing roles, candidates, CV processing, team access, and
          application communication.
        </p>

        <div className="mt-8 space-y-6 text-sm font-semibold leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-black text-slate-950">Responsible use</h2>
            <p className="mt-2">
              Hiring teams are responsible for reviewing AI-assisted outputs, following employment law, and avoiding
              discriminatory or fully automated decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-950">Workspace access</h2>
            <p className="mt-2">
              Workspace owners are responsible for inviting only authorized teammates and removing access when it is no
              longer needed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-950">Service availability</h2>
            <p className="mt-2">
              AI, email delivery, and file processing depend on configured third-party providers. Production workspaces
              should use verified provider credentials and monitor delivery or processing failures.
            </p>
          </section>
        </div>
      </section>
    </PortalShell>
  )
}
