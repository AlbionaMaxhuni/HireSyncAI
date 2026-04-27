import { NextResponse } from 'next/server'
import { analyzeCandidateForRole } from '@/lib/ai'
import { checkRateLimit, rateLimitHeaders, rateLimitKey } from '@/lib/rate-limit'
import { checkWorkspaceCapacity, recordUsageEvent } from '@/lib/saas'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength)
}

export async function POST(req: Request) {
  const { user, role, workspace, supabase } = await getOptionalServerUserWithRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' || !workspace?.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit = checkRateLimit(rateLimitKey(req, 'ai:analyze', user.id), {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(limit) }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    jobTitle?: string
    jobDescription?: string
    resumeText?: string
    candidateName?: string
  } | null

  const jobTitle = cleanText(body?.jobTitle, 160)
  const jobDescription = cleanText(body?.jobDescription, 12000)
  const resumeText = cleanText(body?.resumeText, 60000)
  const candidateName = cleanText(body?.candidateName || 'Candidate', 160)

  if (!jobTitle || !jobDescription || !resumeText) {
    return NextResponse.json({ error: 'Job title, job description, and resume text are required.' }, { status: 400 })
  }

  const capacity = await checkWorkspaceCapacity({
    supabase,
    workspaceId: workspace.id,
    feature: 'aiScreenings',
  })

  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.message }, { status: 402 })
  }

  try {
    const analysis = await analyzeCandidateForRole({
      jobTitle,
      jobDescription,
      resumeText,
      candidateName,
    })

    await recordUsageEvent(supabase, {
      workspaceId: workspace.id,
      userId: user.id,
      feature: 'aiScreenings',
      metadata: {
        source: 'manual-candidate-analysis',
      },
    })

    return NextResponse.json(analysis)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI analysis failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
