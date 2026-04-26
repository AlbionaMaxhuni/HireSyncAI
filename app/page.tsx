import Link from 'next/link'
import { ArrowRight, CheckCircle2, Orbit, Sparkles, UserRoundCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import PortalShell from '@/components/layout/PortalShell'
import { createServerSupabaseUserClient, getOptionalServerUser, getServerUserRole } from '@/lib/server-auth'
import { isJobPublic, type JobRecord } from '@/lib/hiring'

type PublicWorkspace = {
  id: string
  name: string | null
}

async function getFeaturedJobs() {
  const supabase = await createServerSupabaseUserClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(3)

  return ((data ?? []) as JobRecord[]).filter(isJobPublic)
}

async function getWorkspaces(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return {}

  const supabase = await createServerSupabaseUserClient()
  const { data } = await supabase.from('workspaces').select('id,name').in('id', workspaceIds)

  return ((data ?? []) as PublicWorkspace[]).reduce<Record<string, PublicWorkspace>>((accumulator, workspace) => {
    accumulator[workspace.id] = workspace
    return accumulator
  }, {})
}

export default async function LandingPage() {
  const featuredJobs = await getFeaturedJobs()
  const workspacesById = await getWorkspaces(
    Array.from(
      new Set(featuredJobs.map((job) => job.workspace_id).filter((workspaceId): workspaceId is string => Boolean(workspaceId)))
    )
  )
  const { user } = await getOptionalServerUser()
  const userRole = user ? await getServerUserRole(user) : null

  const secondaryAction =
    userRole === 'admin'
      ? {
          href: '/admin',
          label: 'Open admin workspace',
        }
      : user
        ? {
            href: '/applications',
            label: 'View my applications',
          }
        : {
            href: '/login?next=%2Fauth%2Fcomplete',
            label: 'Sign in',
          }

  const journeyCards = [
    {
      eyebrow: 'Candidate path',
      title: 'Browse first',
      body: 'Anyone can read roles before creating an account or sharing personal details.',
    },
    {
      eyebrow: 'Application step',
      title: 'Apply only when ready',
      body: 'Sign in, upload a CV, and send a simple application without extra friction.',
    },
    {
      eyebrow: 'After applying',
      title: 'Track your status',
      body: 'Candidates can come back and see whether the application is applied, in review, or moving forward.',
    },
  ]

  const adminCards = [
    {
      title: 'For candidates',
      body: 'Read the role, sign in only when needed, then apply and track progress.',
    },
    {
      title: 'For hiring teams',
      body: 'Create roles, review candidates, and keep the pipeline in one private workspace.',
    },
  ]

  return (
    <PortalShell>
      <section className="overflow-hidden rounded-[14px] border border-white/70 bg-[linear-gradient(135deg,_#111827_0%,_#1f2937_38%,_#b45309_100%)] px-5 py-7 text-white shadow-[0_30px_120px_rgba(15,23,42,0.16)] md:px-7 md:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-[999px] border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-amber-100">
              <Sparkles size={12} />
              Simple hiring flow
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Browse roles, apply clearly, and track your status.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-200 md:text-base">
              HireSync keeps the public side easy for candidates and the private side focused for the hiring team.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                Explore open roles
                <ArrowRight size={16} />
              </Link>
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
              >
                {secondaryAction.label}
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {adminCards.map((card) => (
              <div key={card.title} className="rounded-[12px] border border-white/12 bg-white/10 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">{card.title}</div>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-200">{card.body}</p>
              </div>
            ))}
            <div className="rounded-[12px] border border-white/12 bg-white/10 p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">Best starting point</div>
              <div className="mt-3 text-xl font-black">Open roles first.</div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                If you are a candidate, start with the jobs page. If you are the hiring team, start with the admin workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {journeyCards.map((card) => (
        <Card key={card.title} className="border-0 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-[10px] bg-amber-100 p-3 text-amber-700">
              {card.title === 'Browse first' ? <Orbit size={18} /> : card.title === 'Apply only when ready' ? <UserRoundCheck size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{card.eyebrow}</div>
              <div className="mt-2 text-xl font-black text-slate-950">{card.title}</div>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            {card.body}
          </p>
        </Card>
        ))}
      </section>

      <section className="mt-6 rounded-[14px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Featured roles</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Open opportunities</h2>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            View all roles
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {featuredJobs.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-slate-200 bg-slate-50 p-7 text-sm font-semibold text-slate-500 lg:col-span-3">
              No jobs are published in the workspace yet.
            </div>
          ) : (
            featuredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="rounded-[12px] border border-slate-200 bg-[#fffdf9] p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                  Open role
                </div>
                <div className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {workspacesById[job.workspace_id ?? '']?.name || 'Hiring team'}
                </div>
                <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">{job.title}</h3>
                <p className="mt-3 line-clamp-4 text-sm font-semibold leading-relaxed text-slate-600">
                  {job.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  Review role
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </PortalShell>
  )
}
