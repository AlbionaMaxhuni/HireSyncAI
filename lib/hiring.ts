export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'final'
  | 'hired'
  | 'rejected'

export type CandidateProcessingState = 'queued' | 'processing' | 'done' | 'failed' | null
export type JobStatus = 'draft' | 'published' | 'archived'

export type CandidateRecord = {
  id: string
  user_id: string
  job_id: string
  workspace_id?: string | null
  full_name: string | null
  email: string | null
  resume_text: string | null
  score: number | null
  status: string | null
  processing_status: CandidateProcessingState
  processing_error?: string | null
  seniority?: string | null
  skills?: string[] | null
  summary?: string | null
  red_flags?: string[] | null
  interview_questions?: string | null
  location?: string | null
  salary_expectation?: string | null
  availability?: string | null
  source?: string | null
  source_filename?: string | null
  resume_file_path?: string | null
  created_at: string
}

export type CandidateNoteRecord = {
  id: string
  candidate_id: string
  workspace_id?: string | null
  user_id: string | null
  user_email: string | null
  content: string
  created_at: string
}

export type JobRecord = {
  id: string
  user_id: string
  workspace_id?: string | null
  title: string
  description: string
  location?: string | null
  employment_type?: string | null
  department?: string | null
  status?: string | null
  slug?: string | null
  created_at: string
}

export function normalizeJobStatus(status: string | null | undefined): JobStatus {
  if (!status) return 'draft'

  const normalized = status.trim().toLowerCase()

  if (normalized === 'published' || normalized === 'open' || normalized === 'active') {
    return 'published'
  }

  if (normalized === 'archived' || normalized === 'closed') {
    return 'archived'
  }

  return 'draft'
}

export function getJobStatusMeta(status: string | null | undefined) {
  const normalized = normalizeJobStatus(status)

  switch (normalized) {
    case 'published':
      return {
        id: normalized,
        label: 'Published',
        badgeClassName: 'bg-emerald-100 text-emerald-700',
      }
    case 'archived':
      return {
        id: normalized,
        label: 'Archived',
        badgeClassName: 'bg-slate-200 text-slate-700',
      }
    default:
      return {
        id: normalized,
        label: 'Draft',
        badgeClassName: 'bg-amber-100 text-amber-700',
      }
  }
}

export const PIPELINE_STAGES: {
  id: CandidateStage
  label: string
  shortLabel: string
  dotClassName: string
  badgeClassName: string
}[] = [
  {
    id: 'applied',
    label: 'Applied',
    shortLabel: 'Applied',
    dotClassName: 'bg-slate-400',
    badgeClassName: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'screening',
    label: 'Screening',
    shortLabel: 'Screen',
    dotClassName: 'bg-blue-500',
    badgeClassName: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'interview',
    label: 'Interview',
    shortLabel: 'Interview',
    dotClassName: 'bg-amber-500',
    badgeClassName: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'final',
    label: 'Final Review',
    shortLabel: 'Final',
    dotClassName: 'bg-indigo-500',
    badgeClassName: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'hired',
    label: 'Hired',
    shortLabel: 'Hired',
    dotClassName: 'bg-emerald-500',
    badgeClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    shortLabel: 'Rejected',
    dotClassName: 'bg-rose-500',
    badgeClassName: 'bg-rose-100 text-rose-700',
  },
]

export function normalizeCandidateStage(status: string | null | undefined): CandidateStage {
  switch (status) {
    case 'screening':
    case 'interview':
    case 'final':
    case 'hired':
    case 'rejected':
    case 'applied':
      return status
    case 'new':
      return 'applied'
    default:
      return 'applied'
  }
}

export function getStageMeta(stage: string | null | undefined) {
  const normalized = normalizeCandidateStage(stage)
  return PIPELINE_STAGES.find((item) => item.id === normalized) ?? PIPELINE_STAGES[0]
}

export function getScoreLabel(score: number | null | undefined) {
  if (typeof score !== 'number') return 'Not scored'
  if (score >= 85) return 'Strong match'
  if (score >= 70) return 'Promising'
  if (score >= 50) return 'Partial match'
  return 'Weak match'
}

export function getScoreTone(score: number | null | undefined) {
  if (typeof score !== 'number') return 'bg-slate-100 text-slate-600'
  if (score >= 85) return 'bg-emerald-100 text-emerald-700'
  if (score >= 70) return 'bg-blue-100 text-blue-700'
  if (score >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

export function formatCandidateSource(candidate: Pick<CandidateRecord, 'source' | 'source_filename'>) {
  if (candidate.source === 'bulk-upload') return candidate.source_filename ?? 'Bulk upload'
  if (candidate.source) return candidate.source
  return 'Direct entry'
}

export function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

export function isJobPublic(job: Pick<JobRecord, 'status'>) {
  return normalizeJobStatus(job.status) === 'published'
}
