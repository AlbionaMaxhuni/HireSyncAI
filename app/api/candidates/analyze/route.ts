import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
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
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY missing' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)

  const jobTitle = String(body?.jobTitle ?? '').trim()
  const jobDescription = String(body?.jobDescription ?? '').trim()
  const resumeText = String(body?.resumeText ?? '').trim()
  const candidateName = String(body?.candidateName ?? 'Candidate').trim()

  if (!jobTitle || !jobDescription || !resumeText) {
    return NextResponse.json(
      { error: 'Missing fields. Required: jobTitle, jobDescription, resumeText' },
      { status: 400 }
    )
  }

  const resumeCharCount = resumeText.length

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      stream: true,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            'You are an unbiased senior recruiter.',
            'Return ONLY valid JSON. No markdown. No extra text.',
            'Schema:',
            '{ "score": number (1-100), "red_flags": string[], "interview_questions": string[] }',
            '',
            'Scoring rules (IMPORTANT):',
            '- If resume text is short or lacks evidence, score must be LOW.',
            '- If resume has very little detail, keep score <= 50.',
            '- Always return at least 2 red_flags. If no serious red flags, return 2 minor concerns.',
            '- Interview questions must be specific to the job and gaps in the resume.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `JOB TITLE: ${jobTitle}`,
            `JOB DESCRIPTION:\n${jobDescription}`,
            ``,
            `CANDIDATE: ${candidateName}`,
            `RESUME CHAR COUNT: ${resumeCharCount}`,
            `RESUME TEXT:\n${resumeText}`,
            ``,
            `Return JSON only.`,
          ].join('\n'),
        },
      ],
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `OpenRouter error (${upstream.status}): ${errText || 'Unknown error'}` },
      { status: 502 }
    )
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}