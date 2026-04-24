import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseResume } from '@/lib/resume/parseResume'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

type AiJson = {
  score: number
  seniority: string
  status_suggestion: 'screening' | 'interview' | 'rejected'
  summary: string
  skills: string[]
  red_flags: string[]
  interview_questions: string[]
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown processing error'
}

function safeParseAiJson(text: string): AiJson | null {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<AiJson>

    return {
      score: Math.max(1, Math.min(100, Math.round(parsed.score ?? 0))),
      seniority: String(parsed.seniority ?? 'Junior'),
      status_suggestion:
        parsed.status_suggestion === 'interview' || parsed.status_suggestion === 'rejected'
          ? parsed.status_suggestion
          : 'screening',
      summary: String(parsed.summary ?? ''),
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map(String) : [],
      interview_questions: Array.isArray(parsed.interview_questions)
        ? parsed.interview_questions.map(String)
        : [],
    }
  } catch {
    return null
  }
}

async function aiAnalyze(jobTitle: string, jobDescription: string, resumeText: string) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing')

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are an expert AI recruiter. Return ONLY valid JSON.
Schema:
{
  "score": number,
  "seniority": "Intern"|"Junior"|"Mid"|"Senior"|"Lead",
  "status_suggestion": "screening"|"interview"|"rejected",
  "summary": "2 sentence summary with strengths and gaps",
  "skills": string[],
  "red_flags": string[],
  "interview_questions": string[]
}`,
        },
        {
          role: 'user',
          content: `Analyze this resume for the ${jobTitle} role.\nJob description: ${jobDescription}\nResume: ${resumeText}`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!upstream.ok) {
    const errorText = await upstream.text().catch(() => '')
    throw new Error(errorText || `AI provider returned ${upstream.status}`)
  }

  const json = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const text = json.choices?.[0]?.message?.content
  if (!text) throw new Error('AI provider returned an empty response')

  const parsed = safeParseAiJson(text)
  if (!parsed) throw new Error('Could not parse AI JSON response')

  return parsed
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getOptionalServerUserWithRole()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { jobId?: string; limit?: number } | null
  const jobId = String(body?.jobId ?? '')
  const limit = Math.max(1, Math.min(10, Number(body?.limit ?? 5)))

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const { data: job, error: jobError } = await supabase.from('jobs').select('*').eq('id', jobId).single()
  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Job not found' }, { status: 404 })
  }

  const { data: queued, error: queuedError } = await supabase
    .from('candidates')
    .select('*')
    .eq('job_id', jobId)
    .eq('processing_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (queuedError) {
    return NextResponse.json({ error: queuedError.message }, { status: 500 })
  }

  if (!queued?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let processed = 0

  for (const candidate of queued) {
    try {
      await supabase.from('candidates').update({ processing_status: 'processing' }).eq('id', candidate.id)

      if (!candidate.resume_file_path) {
        throw new Error('Resume file missing for queued candidate')
      }

      const download = await supabaseAdmin.storage.from('resumes').download(candidate.resume_file_path)
      if (download.error) throw download.error

      const parsedResume = await parseResume(
        candidate.source_filename || 'resume.pdf',
        await download.data.arrayBuffer()
      )

      const ai = await aiAnalyze(job.title, job.description, parsedResume.text || '')
      const recommendedNextStep =
        ai.status_suggestion === 'interview'
          ? 'Recommended next step: interview.'
          : ai.status_suggestion === 'rejected'
            ? 'Recommended next step: careful rejection review.'
            : 'Recommended next step: screening review.'

      await supabaseAdmin
        .from('candidates')
        .update({
          resume_text: parsedResume.text,
          score: ai.score,
          seniority: ai.seniority,
          summary: [ai.summary, recommendedNextStep].filter(Boolean).join(' '),
          skills: ai.skills,
          red_flags: ai.red_flags,
          interview_questions: ai.interview_questions.join('\n'),
          status: 'screening',
          processing_status: 'done',
          processing_error: null,
        })
        .eq('id', candidate.id)

      processed += 1
    } catch (error: unknown) {
      await supabase
        .from('candidates')
        .update({
          processing_status: 'failed',
          processing_error: getErrorMessage(error),
        })
        .eq('id', candidate.id)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
