export type WorkspaceRole = 'owner' | 'recruiter'

export type WorkspaceSummary = {
  id: string
  name: string
  website: string | null
  tagline: string | null
  membershipRole: WorkspaceRole | null
}

export type WorkspaceMemberRecord = {
  id: string
  workspace_id: string
  user_id: string
  email: string | null
  role: string
  status: string
  joined_at: string
  created_at: string
  invited_by?: string | null
}

export type WorkspaceInviteRecord = {
  id: string
  workspace_id: string
  email: string
  role: string
  invite_code: string
  invited_by?: string | null
  accepted_at: string | null
  expires_at: string | null
  last_sent_at?: string | null
  last_email_id?: string | null
  last_send_error?: string | null
  created_at: string
}

export function normalizeWorkspaceRole(value: string | null | undefined): WorkspaceRole | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (normalized === 'owner') return 'owner'
  if (normalized === 'recruiter' || normalized === 'admin') return 'recruiter'

  return null
}

export function formatWorkspaceRole(value: string | null | undefined) {
  const role = normalizeWorkspaceRole(value)

  if (role === 'owner') return 'Owner'
  if (role === 'recruiter') return 'Recruiter'
  return 'Member'
}
