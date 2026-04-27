import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzeCandidateForRole } from '@/lib/ai'
import { parseResume } from '@/lib/resume/parseResume'
import { recordUsageEvent } from '@/lib/saas'

type ProcessingJob = {
  id: string
  title: string
  description: string
}

type ProcessingCandidate = {
  id: string
  resume_file_path: string | null
  source_filename: string | null
  workspace_id?: string | null
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

export async function aiAnalyze(jobTitle: string, jobDescription: string, resumeText: string) {
  return analyzeCandidateForRole({ jobTitle, jobDescription, resumeText })
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

      await recordUsageEvent(supabaseAdmin, {
        workspaceId: candidate.workspace_id,
        feature: 'aiScreenings',
        quantity: 1,
        metadata: {
          candidateId: candidate.id,
          jobId: job.id,
          source: 'candidate-processing',
        },
      })

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
