import { NextResponse } from 'next/server'
import { buildCandidateStatusEmail } from '@/lib/communications'
import { sendTransactionalEmail } from '@/lib/email'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'
import type { CandidateNoteRecord } from '@/lib/hiring'

export const runtime = 'nodejs'

type CandidateEmailRow = {
  id: string
  workspace_id: string | null
  full_name: string | null
  email: string | null
  status: string | null
  jobs?: { title: string } | Array<{ title: string }> | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { candidateId?: string; stage?: string } | null
  const candidateId = String(body?.candidateId ?? '').trim()
  const requestedStage = typeof body?.stage === 'string' ? body.stage : null

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId is required.' }, { status: 400 })
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('id,workspace_id,full_name,email,status,jobs(title)')
    .eq('id', candidateId)
    .maybeSingle()

  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 })
  }

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 })
  }

  if (!candidate.email) {
    return NextResponse.json({ error: 'Candidate email is missing.' }, { status: 400 })
  }

  const typedCandidate = candidate as CandidateEmailRow
  const relatedJob = Array.isArray(typedCandidate.jobs) ? typedCandidate.jobs[0] : typedCandidate.jobs

  const { data: workspace } = candidate.workspace_id
    ? await supabase.from('workspaces').select('name').eq('id', candidate.workspace_id).maybeSingle()
    : { data: null }

  const draft = buildCandidateStatusEmail({
    candidateName: typedCandidate.full_name || 'there',
    jobTitle: relatedJob?.title || 'the role',
    companyName: workspace?.name || 'our team',
    stage: requestedStage || typedCandidate.status,
  })

  try {
    const sent = await sendTransactionalEmail({
      to: candidate.email,
      subject: draft.subject,
      text: draft.body,
    })

    let note: CandidateNoteRecord | null = null

    if (candidate.workspace_id) {
      const noteInsert = await supabase
        .from('candidate_notes')
        .insert({
          candidate_id: candidate.id,
          workspace_id: candidate.workspace_id,
          user_id: user.id,
          user_email: user.email ?? null,
          content: `Sent candidate email to ${candidate.email}. Subject: ${draft.subject}. Provider id: ${sent.id}`,
        })
        .select('*')
        .single()

      if (!noteInsert.error && noteInsert.data) {
        note = noteInsert.data as CandidateNoteRecord
      }
    }

    return NextResponse.json({
      ok: true,
      emailId: sent.id,
      note,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
