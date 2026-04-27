import { NextResponse } from 'next/server'
import { analyzeCandidateForRole } from '@/lib/ai'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { checkWorkspaceCapacity, recordAuditLog, recordUsageEvent } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { CandidateRecord } from '@/lib/hiring'

export const runtime = 'nodejs'

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength)
}

export async function POST(req: Request) {
  const { supabase, user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'candidates:manual', user.id), {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many candidate changes. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    jobId?: string
    fullName?: string
    email?: string
    resumeText?: string
  } | null

  const jobId = cleanText(body?.jobId, 120)
  const fullName = cleanText(body?.fullName, 160)
  const email = cleanText(body?.email, 240).toLowerCase()
  const resumeText = cleanText(body?.resumeText, 60000)

  if (!jobId) return NextResponse.json({ error: 'Job is required.' }, { status: 400 })
  if (!fullName) return NextResponse.json({ error: 'Candidate name is required.' }, { status: 400 })
  if (!resumeText) return NextResponse.json({ error: 'Resume text is required.' }, { status: 400 })

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,title,description,workspace_id,workspaces(name)')
    .eq('id', jobId)
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })

  const capacity = await checkWorkspaceCapacity({
    supabase,
    workspaceId: workspace.id,
    feature: 'candidates',
  })

  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message }, { status: 402 })
  }

  const companyName =
    job.workspaces && typeof job.workspaces === 'object' && 'name' in job.workspaces
      ? (job.workspaces.name as string | null) ?? null
      : null

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      user_id: user.id,
      job_id: job.id,
      workspace_id: workspace.id,
      job_title_snapshot: job.title,
      company_name_snapshot: companyName,
      full_name: fullName,
      email: email || null,
      resume_text: resumeText,
      status: 'applied',
      processing_status: null,
      processing_error: null,
      source: 'manual-entry',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let candidate = data as CandidateRecord
  let analyzed = false
  let analysisSkippedReason: string | null = null

  if (process.env.OPENROUTER_API_KEY) {
    const aiCapacity = await checkWorkspaceCapacity({
      supabase,
      workspaceId: workspace.id,
      feature: 'aiScreenings',
    })

    if (aiCapacity.ok) {
      try {
        const analysis = await analyzeCandidateForRole({
          jobTitle: job.title,
          jobDescription: job.description,
          resumeText,
          candidateName: fullName,
        })

        const recommendedNextStep =
          analysis.status_suggestion === 'interview'
            ? 'Recommended next step: interview.'
            : analysis.status_suggestion === 'rejected'
              ? 'Recommended next step: careful rejection review.'
              : 'Recommended next step: screening review.'

        const update = await supabase
          .from('candidates')
          .update({
            score: analysis.score,
            seniority: analysis.seniority,
            summary: [analysis.summary, recommendedNextStep].filter(Boolean).join(' '),
            skills: analysis.skills,
            red_flags: analysis.red_flags,
            interview_questions: analysis.interview_questions.join('\n'),
            status: 'screening',
            processing_status: 'done',
            processing_error: null,
          })
          .eq('id', candidate.id)
          .select('*')
          .single()

        if (!update.error && update.data) {
          candidate = update.data as CandidateRecord
          analyzed = true
          await recordUsageEvent(supabase, {
            workspaceId: workspace.id,
            userId: user.id,
            feature: 'aiScreenings',
            metadata: { source: 'manual-entry', candidateId: candidate.id },
          })
        }
      } catch (error: unknown) {
        analysisSkippedReason = error instanceof Error ? error.message : 'AI analysis skipped.'
      }
    } else {
      analysisSkippedReason = aiCapacity.message
    }
  }

  await recordUsageEvent(supabase, {
    workspaceId: workspace.id,
    userId: user.id,
    feature: 'candidates',
    metadata: { source: 'manual-entry', candidateId: candidate.id, jobId: job.id },
  })

  await recordAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'candidate.manual_created',
    targetType: 'candidate',
    targetId: candidate.id,
    metadata: { jobId: job.id, analyzed },
  })

  return NextResponse.json({
    candidate,
    analyzed,
    analysisSkippedReason,
  })
}
