import type { SupabaseClient } from '@supabase/supabase-js'
import { parseResume } from '@/lib/resume/parseResume'

type AiJson = {
  score: number
  seniority: string
  status_suggestion: 'screening' | 'interview' | 'rejected'
  summary: string
  skills: string[]
  red_flags: string[]
  interview_questions: string[]
}

type ProcessingJob = {
  id: string
  title: string
  description: string
}

type ProcessingCandidate = {
  id: string
  resume_file_path: string | null
  source_filename: string | null
}

export type CandidateBatchProcessingResult = {
  processed: number
  processedCandidateIds: string[]
  failed: Array<{ candidateId: string; error: string }>
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

export async function aiAnalyze(jobTitle: string, jobDescription: string, resumeText: string) {
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

export async function processCandidateBatch({
  supabaseAdmin,
  job,
  candidates,
}: {
  supabaseAdmin: SupabaseClient
  job: ProcessingJob
  candidates: ProcessingCandidate[]
}): Promise<CandidateBatchProcessingResult> {
  let processed = 0
  const processedCandidateIds: string[] = []
  const failed: Array<{ candidateId: string; error: string }> = []

  for (const candidate of candidates) {
    try {
      await supabaseAdmin.from('candidates').update({ processing_status: 'processing' }).eq('id', candidate.id)

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

      const { error: updateError } = await supabaseAdmin
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

      if (updateError) throw updateError

      processed += 1
      processedCandidateIds.push(candidate.id)
    } catch (error: unknown) {
      const message = getErrorMessage(error)

      await supabaseAdmin
        .from('candidates')
        .update({
          processing_status: 'failed',
          processing_error: message,
        })
        .eq('id', candidate.id)

      failed.push({ candidateId: candidate.id, error: message })
    }
  }

  return {
    processed,
    processedCandidateIds,
    failed,
  }
}
