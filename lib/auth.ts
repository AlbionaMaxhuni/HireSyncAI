import type { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'candidate'

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()

  if (normalized === 'admin' || normalized === 'owner' || normalized === 'recruiter') {
    return 'admin'
  }

  if (normalized === 'candidate' || normalized === 'applicant') {
    return 'candidate'
  }

  return null
}

export function getExplicitUserRole(user: Pick<User, 'app_metadata' | 'user_metadata'> | null | undefined) {
  if (!user) return null

  return (
    normalizeRole(user.app_metadata?.role) ??
    normalizeRole(user.user_metadata?.role) ??
    normalizeRole(user.user_metadata?.workspace_role)
  )
}

function parseEmailList(value: string | undefined) {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function getConfiguredAdminEmails() {
  return Array.from(
    new Set([
      ...parseEmailList(process.env.ADMIN_EMAILS),
      ...parseEmailList(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    ])
  )
}

export function isConfiguredAdminEmail(email: string | null | undefined) {
  if (!email) return false
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase())
}

export function getUserDisplayName(
  user: Pick<User, 'email' | 'user_metadata'> | null | undefined,
  fallback = 'Hiring Team'
) {
  const fullName = user?.user_metadata?.full_name

  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName.trim()
  }

  if (typeof user?.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0]
  }

  return fallback
}
