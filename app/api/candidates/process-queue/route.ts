import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { parseResume } from '@/lib/resume/parseResume'

export const runtime = 'nodejs'

type AiJson = {
  score: number
  red_flags: string[]
  interview_questions: string[]
}

type AiResponsePayload = {
  score?: number
  red_flags?: unknown[]
  interview_questions?: unknown[]
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error ?? 'Unknown error')
}

function safeParseAiJson(text: string): AiJson | null {
  try {
    const parsed = JSON.parse(text) as AiResponsePayload
    if (
      typeof parsed?.score === 'number' &&
      Array.isArray(parsed?.red_flags) &&
      Array.isArray(parsed?.interview_questions)
    ) {
      return {
        score: Math.max(1, Math.min(100, Math.round(parsed.score))),
        red_flags: parsed.red_flags.map((x) => String(x)),
        interview_questions: parsed.interview_questions.map((x) => String(x)),
      }
    }
  } catch {}
  return null
}

function formatQuestionsText(qs: string[]) {
  return qs.map((q, i) => `${i + 1}) ${q}`).join('\n')
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
      model: 'openai/gpt-3.5-turbo',
      stream: false,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            'You are an unbiased senior recruiter.',
            'Return ONLY valid JSON. No markdown. No extra text.',
            'Schema: { "score": number (1-100), "red_flags": string[], "interview_questions": string[] }',
            'Scoring rules:',
            '- If resume lacks evidence, score must be low.',
            '- Always return at least 2 red_flags (minor concerns if none).',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `JOB TITLE: ${jobTitle}`,
            `JOB DESCRIPTION:\n${jobDescription}`,
            ``,
            `RESUME TEXT:\n${resumeText}`,
            ``,
            `Return JSON only.`,
          ].join('\n'),
        },
      ],
    }),
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    throw new Error(`OpenRouter error (${upstream.status}): ${errText || 'Unknown error'}`)
  }

  const json = await upstream.json()
  const text = json?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new Error('Invalid AI response')

  const parsed = safeParseAiJson(text)
  if (!parsed) throw new Error('Could not parse AI JSON')

  return parsed
}

export async function POST(req: Request) {
  const cookieStore = await cookies()

  // user client (RLS)
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

  // admin client (bypass RLS for storage)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const jobId = String(body?.jobId ?? '')
  const limit = Math.max(1, Math.min(50, Number(body?.limit ?? 10)))

  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  // Load job (RLS ensures job belongs to the user)
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id,title,description')
    .eq('id', jobId)
    .maybeSingle()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Get queued candidates
  const { data: queued, error: qErr } = await supabase
    .from('candidates')
    .select('id,resume_file_path,source_filename')
    .eq('job_id', jobId)
    .eq('processing_status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (qErr) return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  if (!queued?.length) return NextResponse.json({ ok: true, processed: 0 })

  let processed = 0

  for (const c of queued) {
    const candidateId = c.id as string
    const path = c.resume_file_path as string | null
    const filename = (c.source_filename as string | null) || 'resume'

    if (!path) {
      await supabase
        .from('candidates')
        .update({ processing_status: 'failed', processing_error: 'Missing resume_file_path' })
        .eq('id', candidateId)
      continue
    }

    // mark processing
    await supabase.from('candidates').update({ processing_status: 'processing' }).eq('id', candidateId)

    try {
      // IMPORTANT: download with admin client (no RLS issues)
      const dl = await supabaseAdmin.storage.from('resumes').download(path)
      if (dl.error || !dl.data) throw new Error(dl.error?.message ?? 'Download failed')

      const bytes = await dl.data.arrayBuffer()
      const parsed = await parseResume(filename, bytes)

      if (!parsed.text || parsed.text.length < 50) {
        throw new Error('Could not extract enough text from resume')
      }

      const ai = await aiAnalyze(job.title, job.description, parsed.text)
      const questionsText = formatQuestionsText(ai.interview_questions)

      const upd = await supabase
        .from('candidates')
        .update({
          resume_text: parsed.text,
          score: ai.score,
          red_flags: ai.red_flags,
          interview_questions: questionsText,
          processing_status: 'done',
          processing_error: null,
        })
        .eq('id', candidateId)

      if (upd.error) throw new Error(upd.error.message)

      processed++
    } catch (e: unknown) {
      await supabase
        .from('candidates')
        .update({
          processing_status: 'failed',
          processing_error: getErrorMessage(e),
        })
        .eq('id', candidateId)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
