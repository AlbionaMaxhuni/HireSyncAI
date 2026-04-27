import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkspacePlan = 'starter' | 'pro' | 'business'
export type UsageFeature = 'jobs' | 'candidates' | 'members' | 'aiScreenings'

type WorkspacePlanRow = {
  plan?: string | null
}

type WorkspaceLimit = {
  jobs: number
  candidates: number
  members: number
  aiScreenings: number
}

type AuditInput = {
  workspaceId?: string | null
  actorUserId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown>
}

type UsageInput = {
  workspaceId?: string | null
  userId?: string | null
  feature: UsageFeature
  quantity?: number
  metadata?: Record<string, unknown>
}

export const PLAN_LIMITS: Record<WorkspacePlan, WorkspaceLimit> = {
  starter: {
    jobs: 3,
    candidates: 50,
    members: 2,
    aiScreenings: 50,
  },
  pro: {
    jobs: 25,
    candidates: 1000,
    members: 10,
    aiScreenings: 1000,
  },
  business: {
    jobs: 250,
    candidates: 10000,
    members: 50,
    aiScreenings: 10000,
  },
}

function normalizePlan(value: string | null | undefined): WorkspacePlan {
  if (value === 'pro' || value === 'business') return value
  return 'starter'
}

function featureLabel(feature: UsageFeature) {
  if (feature === 'aiScreenings') return 'AI screenings'
  return feature
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  workspaceId: string
) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)

  if (table === 'workspace_members') {
    query = query.eq('status', 'active')
  }

  const result = await query
  return result.error ? null : result.count ?? 0
}

export async function getWorkspacePlan(supabase: SupabaseClient, workspaceId: string): Promise<WorkspacePlan> {
  const { data, error } = await supabase.from('workspaces').select('plan').eq('id', workspaceId).maybeSingle()
  if (error) return 'starter'

  return normalizePlan((data as WorkspacePlanRow | null)?.plan)
}

export async function getWorkspaceUsageCount(
  supabase: SupabaseClient,
  workspaceId: string,
  feature: UsageFeature
) {
  if (feature === 'jobs') return (await countRows(supabase, 'jobs', workspaceId)) ?? 0
  if (feature === 'candidates') return (await countRows(supabase, 'candidates', workspaceId)) ?? 0
  if (feature === 'members') return (await countRows(supabase, 'workspace_members', workspaceId)) ?? 0

  const periodStart = new Date()
  periodStart.setUTCDate(1)
  periodStart.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('usage_events')
    .select('quantity')
    .eq('workspace_id', workspaceId)
    .eq('feature', 'aiScreenings')
    .gte('created_at', periodStart.toISOString())

  if (error) {
    return (await countRows(supabase, 'candidates', workspaceId)) ?? 0
  }

  return (data ?? []).reduce((total, row) => total + Number(row.quantity ?? 0), 0)
}

export async function checkWorkspaceCapacity({
  supabase,
  workspaceId,
  feature,
  increment = 1,
}: {
  supabase: SupabaseClient
  workspaceId: string | null | undefined
  feature: UsageFeature
  increment?: number
}) {
  if (!workspaceId) {
    return {
      ok: false as const,
      message: 'Workspace is required before this action can continue.',
    }
  }

  const plan = await getWorkspacePlan(supabase, workspaceId)
  const limits = PLAN_LIMITS[plan]
  const current = await getWorkspaceUsageCount(supabase, workspaceId, feature)
  const limit = limits[feature]

  if (current + increment > limit) {
    return {
      ok: false as const,
      message: `This workspace reached the ${featureLabel(feature)} limit for the ${plan} plan.`,
      plan,
      current,
      limit,
    }
  }

  return {
    ok: true as const,
    plan,
    current,
    limit,
  }
}

export async function recordAuditLog(supabase: SupabaseClient, input: AuditInput) {
  if (!input.workspaceId) return

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      workspace_id: input.workspaceId,
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    })

  void error
}

export async function recordUsageEvent(supabase: SupabaseClient, input: UsageInput) {
  if (!input.workspaceId) return

  const { error } = await supabase
    .from('usage_events')
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId ?? null,
      feature: input.feature,
      quantity: input.quantity ?? 1,
      metadata: input.metadata ?? {},
    })

  void error
}
