import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'
import { PIPELINE_STAGES, normalizeCandidateStage, type CandidateRecord, type JobRecord } from '@/lib/hiring'
import { requireAuthenticatedUser } from '@/lib/server-auth'

type ApplicationRow = CandidateRecord & {
  jobs?: JobRecord | JobRecord[] | null
}

export const revalidate = 0

function getStageProgress(status: string | null) {
  switch (normalizeCandidateStage(status)) {
    case 'applied':
      return 18
    case 'screening':
      return 38
    case 'interview':
      return 62
    case 'final':
      return 82
    case 'hired':
      return 100
    case 'rejected':
      return 100
    default:
      return 18
  }
}

function getJoinedJob(job: ApplicationRow) {
  if (Array.isArray(job.jobs)) {
    return job.jobs[0] ?? null
  }

  return job.jobs ?? null
}

async function getApplications(supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>['supabase'], userId: string) {
  const { data } = await supabase
    .from('candidates')
    .select('*, jobs(*)')
    .eq('user_id', userId)
    .eq('source', 'career-site')
    .order('created_at', { ascending: false })

  return (data ?? []) as ApplicationRow[]
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { user, supabase } = await requireAuthenticatedUser('/applications')
  const resolvedSearchParams = await searchParams
  const applications = await getApplications(supabase, user.id)

  const adminRequired = resolvedSearchParams.message === 'admin_required'
  const inviteInvalid =
    resolvedSearchParams.message === 'invite_invalid' || resolvedSearchParams.message === 'invite_email_mismatch'
  const inProgressCount = applications.filter((application) => {
    const stage = normalizeCandidateStage(application.status)
    return stage === 'screening' || stage === 'interview' || stage === 'final'
  }).length
  const queuedCount = applications.filter((application) => application.processing_status === 'queued').length

  return (
    <PortalShell>
      <section className="rounded-[14px] border border-white/70 bg-[linear-gradient(135deg,_#fff9f2_0%,_#fff2df_46%,_#efe6da_100%)] px-5 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:px-7 md:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">My applications</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-[44px]">
              Track every application in one place.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
              This page shows only the information a candidate actually needs after applying: status, progress, and the role they applied for.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-[10px] bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Browse more roles
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {adminRequired && (
        <div className="mt-6 rounded-[12px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          This account does not have admin workspace access. You can still manage your job applications here.
        </div>
      )}

      {inviteInvalid && (
        <div className="mt-6 rounded-[12px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-900">
          The team invite could not be completed. Make sure you signed in with the same email address that received the invite.
        </div>
      )}

      <section className="mt-6 rounded-[10px] border border-slate-200 bg-white">
        <div className="grid grid-cols-3 divide-x divide-slate-200">
          {[
            ['Applications', applications.length],
            ['In progress', inProgressCount],
            ['Queue', queuedCount],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[10px] border border-slate-200 bg-white">
        {applications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-lg font-black text-slate-950">You have not submitted any applications yet.</div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Start from the jobs page, choose a role that fits, then apply from that role page.
            </div>
            <Link
              href="/jobs"
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Browse jobs
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {['Role', 'Company', 'Status', 'Progress', 'Applied'].map((header) => (
                    <th key={header} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((application) => {
                  const stage = PIPELINE_STAGES.find((item) => item.id === normalizeCandidateStage(application.status))!
                  const progress = getStageProgress(application.status)
                  const joinedJob = getJoinedJob(application)
                  const applicationTitle = joinedJob?.title || application.job_title_snapshot || 'Application'
                  const companyName = application.company_name_snapshot || 'Hiring team'

                  return (
                    <tr key={application.id} className="hover:bg-slate-50">
                      <td className="max-w-[360px] px-5 py-4 text-sm font-black text-slate-950">
                        {applicationTitle}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{companyName}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${stage.badgeClassName}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[160px] items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-slate-950" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-sm font-black text-slate-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                        {new Date(application.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  )
}
