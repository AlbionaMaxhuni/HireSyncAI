import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getExplicitUserRole, getUserDisplayName, isConfiguredAdminEmail, type UserRole } from '@/lib/auth'
import { normalizeWorkspaceRole, type WorkspaceRole, type WorkspaceSummary } from '@/lib/workspace'

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is missing.`)
  }

  return value
}

export async function createServerSupabaseUserClient() {
  const cookieStore = await cookies()

  return createServerClient(getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'), getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export function createServerSupabaseAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.')
  }

  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function getOptionalServerUser() {
  const supabase = await createServerSupabaseUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}

type ProfileAccessRow = {
  role: string | null
  full_name: string | null
  workspace_id: string | null
}

type WorkspaceRow = {
  id: string
  owner_user_id: string
  name: string
  website: string | null
  tagline: string | null
}

type WorkspaceMembershipRow = {
  workspace_id: string
  role: string
  created_at: string
}

export type ServerUserAccess = {
  role: UserRole
  workspace: WorkspaceSummary | null
}

async function getProfileAccess(admin: ReturnType<typeof createServerSupabaseAdminClient>, userId: string) {
  const { data } = await admin
    .from('profiles')
    .select('role,full_name,workspace_id')
    .eq('id', userId)
    .maybeSingle()

  return (data as ProfileAccessRow | null) ?? null
}

async function getWorkspaceById(
  admin: ReturnType<typeof createServerSupabaseAdminClient>,
  workspaceId: string,
  membershipRole: WorkspaceRole | null
) {
  const { data } = await admin
    .from('workspaces')
    .select('id,owner_user_id,name,website,tagline')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!data) return null

  const workspace = data as WorkspaceRow

  return {
    id: workspace.id,
    name: workspace.name,
    website: workspace.website,
    tagline: workspace.tagline,
    membershipRole,
  } satisfies WorkspaceSummary
}

async function getOwnedWorkspace(admin: ReturnType<typeof createServerSupabaseAdminClient>, userId: string) {
  const { data } = await admin
    .from('workspaces')
    .select('id,owner_user_id,name,website,tagline')
    .eq('owner_user_id', userId)
    .maybeSingle()

  const workspace = (data as WorkspaceRow | null) ?? null

  if (!workspace) return null

  return {
    id: workspace.id,
    name: workspace.name,
    website: workspace.website,
    tagline: workspace.tagline,
    membershipRole: 'owner' as const,
  }
}

async function ensureWorkspaceMemberRow(
  admin: ReturnType<typeof createServerSupabaseAdminClient>,
  user: Pick<User, 'id' | 'email'>,
  workspaceId: string,
  role: WorkspaceRole,
  invitedBy: string | null
) {
  await admin.from('workspace_members').upsert(
    {
      workspace_id: workspaceId,
      user_id: user.id,
      email: user.email ?? null,
      role,
      status: 'active',
      invited_by: invitedBy,
    },
    {
      onConflict: 'workspace_id,user_id',
    }
  )
}

async function pickWorkspaceForUser(
  admin: ReturnType<typeof createServerSupabaseAdminClient>,
  userId: string,
  preferredWorkspaceId?: string | null
) {
  const { data } = await admin
    .from('workspace_members')
    .select('workspace_id,role,created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  const memberships = (data ?? []) as WorkspaceMembershipRow[]

  if (memberships.length > 0) {
    const preferredMembership =
      (preferredWorkspaceId
        ? memberships.find((membership) => membership.workspace_id === preferredWorkspaceId)
        : null) ?? memberships[0]

    const workspace = await getWorkspaceById(
      admin,
      preferredMembership.workspace_id,
      normalizeWorkspaceRole(preferredMembership.role)
    )

    if (workspace) {
      return workspace
    }
  }

  if (preferredWorkspaceId) {
    const directWorkspace = await getWorkspaceById(admin, preferredWorkspaceId, null)
    if (directWorkspace) return directWorkspace
  }

  return getOwnedWorkspace(admin, userId)
}

async function ensureWorkspaceForEligibleAdmin(
  admin: ReturnType<typeof createServerSupabaseAdminClient>,
  user: User,
  profile: ProfileAccessRow | null
) {
  const ownJobs = await admin.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  const totalJobs = await admin.from('jobs').select('id', { count: 'exact', head: true })

  const shouldProvisionWorkspace =
    getExplicitUserRole(user) === 'admin' ||
    profile?.role === 'admin' ||
    isConfiguredAdminEmail(user.email) ||
    (!ownJobs.error && (ownJobs.count ?? 0) > 0) ||
    (!totalJobs.error && (totalJobs.count ?? 0) === 0)

  if (!shouldProvisionWorkspace) {
    return null
  }

  const displayName = profile?.full_name?.trim() || getUserDisplayName(user, 'HireSync')
  const workspaceName = displayName ? `${displayName} workspace` : 'HireSync workspace'

  const { data: createdWorkspace, error: workspaceError } = await admin
    .from('workspaces')
    .insert({
      owner_user_id: user.id,
      name: workspaceName,
      website: null,
      tagline: null,
    })
    .select('id,owner_user_id,name,website,tagline')
    .single()

  if (workspaceError || !createdWorkspace) {
    return getOwnedWorkspace(admin, user.id)
  }

  await ensureWorkspaceMemberRow(admin, user, createdWorkspace.id as string, 'owner', user.id)

  await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: displayName,
      role: 'admin',
      workspace_id: createdWorkspace.id,
    },
    {
      onConflict: 'id',
    }
  )

  return {
    id: createdWorkspace.id as string,
    name: String(createdWorkspace.name ?? workspaceName),
    website: (createdWorkspace.website as string | null) ?? null,
    tagline: (createdWorkspace.tagline as string | null) ?? null,
    membershipRole: 'owner' as const,
  }
}

export async function getServerUserAccess(user: User): Promise<ServerUserAccess> {
  const admin = createServerSupabaseAdminClient()
  const profile = await getProfileAccess(admin, user.id)

  let workspace = await pickWorkspaceForUser(admin, user.id, profile?.workspace_id)

  if (!workspace) {
    workspace = await ensureWorkspaceForEligibleAdmin(admin, user, profile)
  }

  if (workspace) {
    return {
      role: 'admin',
      workspace,
    }
  }

  const explicitRole = getExplicitUserRole(user)
  if (explicitRole === 'admin') {
    return {
      role: 'admin',
      workspace: await ensureWorkspaceForEligibleAdmin(admin, user, profile),
    }
  }

  if (profile?.role === 'admin' || isConfiguredAdminEmail(user.email)) {
    return {
      role: 'admin',
      workspace: await ensureWorkspaceForEligibleAdmin(admin, user, profile),
    }
  }

  return {
    role: 'candidate',
    workspace: null,
  }
}

export async function acceptWorkspaceInvite(user: User, inviteCode: string) {
  const code = inviteCode.trim()
  if (!code) return { ok: false as const, reason: 'missing_code' as const }

  const admin = createServerSupabaseAdminClient()
  const { data: invite } = await admin
    .from('workspace_invites')
    .select('id,workspace_id,email,role,invited_by,accepted_at,expires_at')
    .eq('invite_code', code)
    .maybeSingle()

  if (!invite) {
    return { ok: false as const, reason: 'not_found' as const }
  }

  if (!user.email || invite.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return { ok: false as const, reason: 'email_mismatch' as const }
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false as const, reason: 'expired' as const }
  }

  const membershipRole = normalizeWorkspaceRole(invite.role) ?? 'recruiter'

  await ensureWorkspaceMemberRow(admin, user, invite.workspace_id as string, membershipRole, invite.invited_by ?? null)

  await admin.from('workspace_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: getUserDisplayName(user, user.email ?? 'HireSync user'),
      role: 'admin',
      workspace_id: invite.workspace_id,
    },
    {
      onConflict: 'id',
    }
  )

  const workspace = await getWorkspaceById(admin, invite.workspace_id as string, membershipRole)

  return {
    ok: true as const,
    workspace,
  }
}

export async function getOptionalServerUserWithRole() {
  const { supabase, user } = await getOptionalServerUser()
  const access = user ? await getServerUserAccess(user) : null

  return {
    supabase,
    user,
    role: access?.role ?? null,
    workspace: access?.workspace ?? null,
  }
}

export async function getServerUserRole(user: User): Promise<UserRole> {
  const access = await getServerUserAccess(user)
  return access.role
}

export async function requireAuthenticatedUser(redirectTo: string) {
  const { supabase, user } = await getOptionalServerUser()

  if (!user) {
    redirect(`/login?message=auth_required&next=${encodeURIComponent(redirectTo)}`)
  }

  return { supabase, user }
}

export async function requireAdmin(redirectTo: string) {
  const { supabase, user } = await requireAuthenticatedUser(redirectTo)
  const access = await getServerUserAccess(user)

  if (access.role !== 'admin') {
    redirect('/applications?message=admin_required')
  }

  return { supabase, user, role: access.role, workspace: access.workspace }
}
