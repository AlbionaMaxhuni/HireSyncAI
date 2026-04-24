import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Clock3, MapPin } from 'lucide-react'
import Card from '@/components/ui/Card'
import PortalShell from '@/components/layout/PortalShell'
import { createServerSupabaseAdminClient } from '@/lib/server-auth'
import { isJobPublic, type JobRecord } from '@/lib/hiring'

type PublicWorkspace = {
  id: string
  name: string | null
}

async function getJobs() {
  const supabase = createServerSupabaseAdminClient()
  const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false })
  return ((data ?? []) as JobRecord[]).filter(isJobPublic)
}

async function getWorkspaces(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return {}

  const supabase = createServerSupabaseAdminClient()
  const { data } = await supabase.from('workspaces').select('id,name').in('id', workspaceIds)

  return ((data ?? []) as PublicWorkspace[]).reduce<Record<string, PublicWorkspace>>((accumulator, workspace) => {
    accumulator[workspace.id] = workspace
    return accumulator
  }, {})
}

export default async function JobsPage() {
  const jobs = await getJobs()
  const workspacesById = await getWorkspaces(
    Array.from(new Set(jobs.map((job) => job.workspace_id).filter((workspaceId): workspaceId is string => Boolean(workspaceId))))
  )

  return (
    <PortalShell>
      <section className="rounded-[40px] border border-white/70 bg-[linear-gradient(135deg,_#fff9f0_0%,_#fff1da_42%,_#f5eadf_100%)] px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:px-8 md:py-10">
        <div className="max-w-4xl">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Open roles</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Browse roles without friction.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
            Candidates can review every opening before signing in. When they choose a role, the application flow is
            fast, guided, and clean.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{jobs.length}</div>
          </Card>
          <Card className="border-0 bg-white/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Experience</div>
            <div className="mt-2 text-lg font-black tracking-tight text-slate-950">Public-first candidate journey</div>
          </Card>
          <Card className="border-0 bg-white/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Apply flow</div>
            <div className="mt-2 text-lg font-black tracking-tight text-slate-950">Sign in only when ready to apply</div>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {jobs.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/75 p-10 text-sm font-semibold text-slate-500 xl:col-span-2">
            No roles are available right now. Check back soon.
          </div>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group rounded-[34px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <BriefcaseBusiness size={18} />
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  Open role
                  <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </div>
              </div>

              <div className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {workspacesById[job.workspace_id ?? '']?.name || 'Hiring team'}
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{job.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm font-semibold leading-relaxed text-slate-600">
                {job.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {job.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                    <MapPin size={12} />
                    {job.location}
                  </span>
                )}
                {job.employment_type && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                    {job.employment_type}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                  <Clock3 size={12} />
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </PortalShell>
  )
}
