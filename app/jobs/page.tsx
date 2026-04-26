import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Clock3, MapPin } from 'lucide-react'
import PortalShell from '@/components/layout/PortalShell'
import { createServerSupabaseUserClient } from '@/lib/server-auth'
import { isJobPublic, type JobRecord } from '@/lib/hiring'

type PublicWorkspace = {
  id: string
  name: string | null
}

async function getJobs() {
  const supabase = await createServerSupabaseUserClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

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

export default async function JobsPage() {
  const jobs = await getJobs()
  const workspacesById = await getWorkspaces(
    Array.from(new Set(jobs.map((job) => job.workspace_id).filter((workspaceId): workspaceId is string => Boolean(workspaceId))))
  )
  return (
    <PortalShell>
      <section className="rounded-[14px] border border-white/70 bg-[linear-gradient(135deg,_#fff9f0_0%,_#fff1da_42%,_#f5eadf_100%)] px-5 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:px-7 md:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Open roles</div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-[44px]">
              Start with the role, not the login screen.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
              Browse roles first, then sign in only when you are ready to apply.
            </p>
          </div>
          <div className="rounded-[10px] bg-white/80 px-5 py-4 text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles live now</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{jobs.length}</div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[10px] border border-slate-200 bg-white">
        {jobs.length === 0 ? (
          <div className="p-8 text-sm font-semibold text-slate-500">
            No roles are available right now. Check back soon.
          </div>
        ) : (
          jobs.map((job) => (
            <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group grid gap-4 border-b border-slate-100 p-5 transition last:border-b-0 hover:bg-slate-50 lg:grid-cols-[1fr_auto]"
              >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <BriefcaseBusiness size={18} className="text-amber-700" />
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {workspacesById[job.workspace_id ?? '']?.name || 'Hiring team'}
                  </div>
                </div>
                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">{job.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {job.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {job.location && (
                    <span className="inline-flex items-center gap-1.5 rounded-[999px] bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      <MapPin size={12} />
                      {job.location}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className="rounded-[999px] bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                      {job.employment_type}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-[999px] bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                    <Clock3 size={12} />
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 self-center text-sm font-black text-slate-950">
                Open role
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        )}
      </section>
    </PortalShell>
  )
}
