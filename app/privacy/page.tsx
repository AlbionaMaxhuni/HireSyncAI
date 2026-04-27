import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <PortalShell>
      <section className="mx-auto max-w-4xl rounded-[12px] border border-slate-200 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-950">
          <ArrowLeft size={16} />
          Back to jobs
        </Link>

        <div className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Privacy</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Privacy policy</h1>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">
          HireSync AI stores application data only to support the hiring process: candidate identity, contact
          details, CV files, screening notes, pipeline status, and related communication history.
        </p>

        <div className="mt-8 space-y-6 text-sm font-semibold leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-black text-slate-950">What we collect</h2>
            <p className="mt-2">
              We collect the information a candidate submits, including name, email, location, optional notes, and CV
              file. Hiring teams may add internal notes, stage updates, and candidate communication records.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-950">How we use it</h2>
            <p className="mt-2">
              Data is used to evaluate applications, organize the hiring pipeline, generate AI-assisted summaries, and
              communicate status updates. AI results are recommendations for review, not automatic hiring decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-950">Retention and deletion</h2>
            <p className="mt-2">
              Application records should be retained only as long as needed for hiring and legal compliance. Candidates
              can request deletion or export of their data through the hiring team managing the workspace.
            </p>
          </section>
        </div>
      </section>
    </PortalShell>
  )
}
