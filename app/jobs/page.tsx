import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Clock3, MapPin } from 'lucide-react'
import Card from '@/components/ui/Card'
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
  const browseGuide = [
    {
      title: 'Browse roles first',
      body: 'Open the role and understand the fit before doing anything else.',
    },
    {
      title: 'No login barrier',
      body: 'Reading job details stays public so the first step feels simple.',
    },
    {
      title: 'Apply only when ready',
      body: 'Sign in only at the moment you want to upload your CV.',
    },
  ]

  return (
    <PortalShell>
      <section className="rounded-[14px] border border-white/70 bg-[linear-gradient(135deg,_#fff9f0_0%,_#fff1da_42%,_#f5eadf_100%)] px-5 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:px-7 md:py-8">
        <div className="max-w-4xl">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Open roles</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-[44px]">
            Start with the role, not the login screen.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
            This page is the candidate starting point: browse roles, open one, and apply only when you are ready.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles live now</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{jobs.length}</div>
          </Card>
          {browseGuide.slice(1).map((item) => (
            <Card key={item.title} className="border-0 bg-white/80 p-5">
              <div className="text-sm font-black tracking-tight text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{item.body}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Candidate path</div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {browseGuide.map((item, index) => (
            <div key={item.title} className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-950">{index + 1}. {item.title}</div>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {jobs.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-slate-200 bg-white/75 p-8 text-sm font-semibold text-slate-500 xl:col-span-2">
            No roles are available right now. Check back soon.
          </div>
        ) : (
          jobs.map((job) => (
            <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group rounded-[12px] border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-[10px] bg-amber-100 p-3 text-amber-700">
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
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{job.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm font-semibold leading-relaxed text-slate-600">
                {job.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
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
            </Link>
          ))
        )}
      </section>
    </PortalShell>
  )
}
