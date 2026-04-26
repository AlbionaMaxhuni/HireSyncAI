import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
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

          <div className="rounded-[12px] border border-white/12 bg-white/10 p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">Best starting point</div>
            <div className="mt-3 text-2xl font-black">Open roles first.</div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-200">
              Read the role, sign in only when needed, then apply and track progress.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.12em] text-white">
              <div className="rounded-[8px] bg-white/12 px-3 py-3">Browse</div>
              <div className="rounded-[8px] bg-white/12 px-3 py-3">Apply</div>
              <div className="rounded-[8px] bg-white/12 px-3 py-3">Track</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[10px] border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="px-5 pt-5">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Featured roles</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Open opportunities</h2>
          </div>
          <Link
            href="/jobs"
            className="mx-5 mt-5 inline-flex items-center gap-2 rounded-[8px] border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:mt-0"
          >
            View all roles
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-5 border-t border-slate-200">
          {featuredJobs.length === 0 ? (
            <div className="p-7 text-sm font-semibold text-slate-500">
              No jobs are published in the workspace yet.
            </div>
          ) : (
            featuredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {workspacesById[job.workspace_id ?? '']?.name || 'Hiring team'}
                  </div>
                  <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{job.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                    {job.description}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
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
