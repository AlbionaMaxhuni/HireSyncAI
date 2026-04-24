import { redirect } from 'next/navigation'
import JobDetailClient from '@/app/jobs/[id]/JobDetailClient'
import { requireAdmin } from '@/lib/server-auth'

export const revalidate = 0

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: jobId } = await params
  const { supabase } = await requireAdmin(`/admin/jobs/${jobId}`)

  const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle()

  if (!job) redirect('/admin/jobs?message=job_not_found')

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  return <JobDetailClient job={job} initialCandidates={candidates ?? []} />
}
