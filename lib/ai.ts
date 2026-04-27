export type CandidateAnalysis = {
  score: number
  seniority: string
  status_suggestion: 'screening' | 'interview' | 'rejected'
  summary: string
  skills: string[]
  red_flags: string[]
  interview_questions: string[]
}

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

function getOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) throw new Error('AI provider is not configured.')
  return apiKey
}

function getCandidateModel() {
  return process.env.OPENROUTER_CANDIDATE_MODEL?.trim() || 'openai/gpt-4o-mini'
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12)
}

function parseCandidateAnalysis(text: string): CandidateAnalysis | null {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<CandidateAnalysis>
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))))
    const suggestion =
      parsed.status_suggestion === 'interview' || parsed.status_suggestion === 'rejected'
        ? parsed.status_suggestion
        : 'screening'

    return {
      score,
      seniority: String(parsed.seniority ?? 'Not specified').trim() || 'Not specified',
      status_suggestion: suggestion,
      summary: String(parsed.summary ?? '').trim(),
      skills: normalizeStringArray(parsed.skills),
      red_flags: normalizeStringArray(parsed.red_flags),
      interview_questions: normalizeStringArray(parsed.interview_questions),
    }
  } catch {
    return null
  }
}

async function callOpenRouter({
  messages,
  temperature = 0.1,
  model = getCandidateModel(),
}: {
  messages: Array<{ role: 'system' | 'user'; content: string }>
  temperature?: number
  model?: string
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getOpenRouterKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://hiresync.ai',
        'X-Title': 'HireSync AI',
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}.`)
    }

    const payload = (await response.json()) as OpenRouterResponse
    const content = payload.choices?.[0]?.message?.content

    if (!content) throw new Error('AI provider returned an empty response.')
    return content
  } finally {
    clearTimeout(timeout)
  }
}

export async function analyzeCandidateForRole({
  jobTitle,
  jobDescription,
  resumeText,
  candidateName = 'Candidate',
}: {
  jobTitle: string
  jobDescription: string
  resumeText: string
  candidateName?: string
}) {
  const content = await callOpenRouter({
    messages: [
      {
        role: 'system',
        content: `You are an expert AI recruiter. Return ONLY valid JSON.
Schema:
{
  "score": number,
  "seniority": "Intern"|"Junior"|"Mid"|"Senior"|"Lead"|"Not specified",
  "status_suggestion": "screening"|"interview"|"rejected",
  "summary": "2 sentence summary with strengths and gaps",
  "skills": string[],
  "red_flags": string[],
  "interview_questions": string[]
}
Be fair, evidence-based, and avoid protected-class assumptions.`,
      },
      {
        role: 'user',
        content: `JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}

CANDIDATE: ${candidateName}
RESUME:
${resumeText}`,
      },
    ],
  })

  const analysis = parseCandidateAnalysis(content)
  if (!analysis) throw new Error('AI response could not be validated.')

  return analysis
}
