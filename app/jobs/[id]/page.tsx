import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import JobDetailClient from './JobDetailClient'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?message=auth_required')

  const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle()

  if (!job) {
    redirect('/jobs?message=job_not_found')
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  return (
    <JobDetailClient
      job={job}
      initialCandidates={candidates ?? []}
    />
  )
}