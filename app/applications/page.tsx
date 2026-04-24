import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'
import Card from '@/components/ui/Card'
import { PIPELINE_STAGES, normalizeCandidateStage, type CandidateRecord, type JobRecord } from '@/lib/hiring'
import { createServerSupabaseAdminClient, requireAuthenticatedUser } from '@/lib/server-auth'

type ApplicationRow = CandidateRecord & {
  jobs?: JobRecord | null
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

async function getApplications(userId: string) {
  const supabase = createServerSupabaseAdminClient()
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
  const { user } = await requireAuthenticatedUser('/applications')
  const resolvedSearchParams = await searchParams
  const applications = await getApplications(user.id)

  const adminRequired = resolvedSearchParams.message === 'admin_required'
  const inviteInvalid =
    resolvedSearchParams.message === 'invite_invalid' || resolvedSearchParams.message === 'invite_email_mismatch'

  return (
    <PortalShell>
      <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,_#fff9f2_0%,_#fff2df_46%,_#efe6da_100%)] px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:px-8 md:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">My applications</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Keep candidates oriented after they apply.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-relaxed text-slate-600">
              This page gives a simple status view without exposing internal admin detail. It is clear enough for
              candidates and light enough to stay usable.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Browse more roles
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {adminRequired && (
        <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          This account does not have admin workspace access. You can still manage your job applications here.
        </div>
      )}

      {inviteInvalid && (
        <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-900">
          The team invite could not be completed. Make sure you signed in with the same email address that received the invite.
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Applications</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{applications.length}</div>
        </Card>
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">In progress</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {
              applications.filter((application) => {
                const stage = normalizeCandidateStage(application.status)
                return stage === 'screening' || stage === 'interview' || stage === 'final'
              }).length
            }
          </div>
        </Card>
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Processing queue</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {applications.filter((application) => application.processing_status === 'queued').length}
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">What this means</div>
          <div className="mt-3 text-lg font-black tracking-tight text-slate-950">Applied</div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Your application reached the team and is safely inside the pipeline.
          </p>
        </Card>
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Screening</div>
          <div className="mt-3 text-lg font-black tracking-tight text-slate-950">Review in progress</div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            The team is reviewing fit, experience, and the next best follow-up step.
          </p>
        </Card>
        <Card className="border-0 bg-white/80 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Interview / Final</div>
          <div className="mt-3 text-lg font-black tracking-tight text-slate-950">Advanced stages</div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            These stages mean the application moved beyond initial review toward a hiring decision.
          </p>
        </Card>
      </section>

      <section className="mt-6 space-y-4">
        {applications.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/75 p-10 text-sm font-semibold text-slate-500">
            You have not submitted any applications yet.
          </div>
        ) : (
          applications.map((application) => {
            const stage = PIPELINE_STAGES.find((item) => item.id === normalizeCandidateStage(application.status))!
            const progress = getStageProgress(application.status)

            return (
              <Card key={application.id} className="border-0 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        {application.jobs?.title || 'Application'}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${stage.badgeClassName}`}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                      {application.jobs?.description || 'Your application is stored in the hiring pipeline.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                        <Clock3 size={12} />
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                        <Sparkles size={12} />
                        Processing: {application.processing_status || 'not started'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className={`h-3 rounded-full ${
                            stage.id === 'rejected'
                              ? 'bg-rose-500'
                              : stage.id === 'hired'
                                ? 'bg-emerald-500'
                                : 'bg-slate-950'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Status</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-black">
                      <CheckCircle2 size={16} className="text-emerald-300" />
                      {stage.label}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </section>
    </PortalShell>
  )
}
