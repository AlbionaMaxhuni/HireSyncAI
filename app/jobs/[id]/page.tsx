import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Clock3, MapPin } from 'lucide-react'
import Card from '@/components/ui/Card'
import PortalShell from '@/components/layout/PortalShell'
import ApplicationPanel from '@/components/jobs/ApplicationPanel'
import { getUserDisplayName } from '@/lib/auth'
import { isJobPublic } from '@/lib/hiring'
import {
  createServerSupabaseUserClient,
  getOptionalServerUser,
} from '@/lib/server-auth'
import type { JobRecord } from '@/lib/hiring'

export const revalidate = 0

type PublicWorkspace = {
  id: string
  name: string | null
  website: string | null
  tagline: string | null
}

async function getJob(jobId: string) {
  const supabase = await createServerSupabaseUserClient()
  const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) throw error
  return data as JobRecord | null
}

async function getWorkspace(workspaceId: string) {
  const supabase = await createServerSupabaseUserClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('id,name,website,tagline')
    .eq('id', workspaceId)
    .maybeSingle()

  if (error) throw error
  return (data as PublicWorkspace | null) ?? null
}

async function getHasApplied(jobId: string, userId: string) {
  const { supabase } = await getOptionalServerUser()
  const { count } = await supabase
    .from('candidates')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .eq('source', 'career-site')

  return (count ?? 0) > 0
}

export default async function PublicJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ apply?: string }>
}) {
  const { id: jobId } = await params
  const resolvedSearchParams = await searchParams
  const job = await getJob(jobId)

  if (!job || !isJobPublic(job)) {
    notFound()
  }

  const workspace = job.workspace_id ? await getWorkspace(job.workspace_id) : null

  const { user } = await getOptionalServerUser()
  const hasApplied = user ? await getHasApplied(jobId, user.id) : false
  const focusApply = resolvedSearchParams.apply === '1'

  return (
    <PortalShell>
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[14px] border border-white/70 bg-[linear-gradient(135deg,_#fffaf3_0%,_#fff2df_46%,_#f1e7da_100%)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] md:p-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            Back to roles
          </Link>

          <div className="mt-6 inline-flex items-center gap-2 rounded-[999px] bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">
            <BriefcaseBusiness size={12} />
            Open opportunity
          </div>

          <div className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {workspace?.name || 'Hiring team'}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-[44px]">{job.title}</h1>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600 md:text-base">{job.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {job.location && (
              <span className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                <MapPin size={15} />
                {job.location}
              </span>
            )}
            {job.employment_type && (
              <span className="rounded-[10px] bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
                {job.employment_type}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
              <Clock3 size={15} />
              Posted {new Date(job.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <ApplicationPanel
          jobId={job.id}
          focusOnMount={focusApply}
          isAuthenticated={Boolean(user)}
          hasApplied={hasApplied}
          defaultName={getUserDisplayName(user, '')}
          defaultEmail={user?.email ?? ''}
        />
      </section>

      <section className="mt-6">
        <Card className="border-0 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">About this hiring team</div>
          <div className="mt-4 rounded-[12px] border border-slate-200 bg-slate-50 p-5">
            <div className="text-lg font-black text-slate-950">
              {workspace?.name || 'Hiring team'}
            </div>
            <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              {workspace?.tagline ||
                'This role is published from a structured hiring workspace designed to keep the application process clear and professional.'}
            </div>
            {workspace?.website ? (
              <Link
                href={workspace.website}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Visit company website
                <ArrowUpRight size={15} />
              </Link>
            ) : null}
          </div>

          <div className="mt-5 space-y-4 text-sm font-semibold leading-relaxed text-slate-600">
            <p>
              This page is meant to help you understand the role before you decide to apply.
            </p>
            <p>
              If the role fits, the application is simple: sign in, upload your CV, and submit.
            </p>
          </div>
        </Card>
      </section>
    </PortalShell>
  )
}
