import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getServerUserRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

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

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await getServerUserRole(user)
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ error: 'API Key missing' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const { jobTitle, jobDescription, resumeText, candidateName = 'Candidate' } = body || {}

  if (!jobTitle || !jobDescription || !resumeText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const systemPrompt = `
    You are an expert AI Talent Auditor for a high-end recruitment agency.
    Analyze the resume against the job description and return a detailed, professional JSON.

    REQUIRED JSON FORMAT (STRICT):
    {
      "score": number (0-100),
      "seniority": "Intern" | "Junior" | "Mid" | "Senior" | "Lead",
      "status_suggestion": "screening" | "interview" | "rejected",
      "summary": "A 2-sentence professional overview of why they match or fail.",
      "skills": ["Skill1", "Skill2", "Skill3"],
      "red_flags": ["Concern1", "Concern2"],
      "interview_questions": ["Question1", "Question2"]
    }

    RULES:
    1. If resume is poor quality or fake, score < 20 and status_suggestion: "rejected".
    2. Be critical. Only 90+ scores for perfect matches.
    3. Extract exactly 5-8 key technical skills.
  `;

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hiresyncai.vercel.app', // Për OpenRouter rankings
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini', // Modeli më i mirë për çmim/performancë
      temperature: 0.1, // E mbajmë ulët për rezultate konsistente
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `JOB: ${jobTitle}\nJD: ${jobDescription}\n\nCANDIDATE: ${candidateName}\nRESUME: ${resumeText}` 
        },
      ],
      response_format: { type: "json_object" } // Siguron që del vetëm JSON
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    return NextResponse.json({ error: `AI Provider Error: ${err}` }, { status: 502 })
  }

  // Shënim: E hoqëm 'stream: true' sepse për JSON të strukturuar 
  // është më mirë të marrim objektin e plotë që ta ruajmë në DB.
  const aiResponse = await upstream.json()
  const analysis = JSON.parse(aiResponse.choices[0].message.content)

  return NextResponse.json(analysis)
}
