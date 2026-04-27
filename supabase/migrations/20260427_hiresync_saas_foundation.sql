-- HireSync AI SaaS foundation
-- Adds plan limits, audit logs, usage tracking, and candidate consent fields.

alter table public.workspaces
  add column if not exists plan text not null default 'starter',
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days'),
  add column if not exists onboarding_completed boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workspaces'::regclass
      and conname = 'workspaces_plan_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_plan_check
      check (plan in ('starter', 'pro', 'business'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workspaces'::regclass
      and conname = 'workspaces_subscription_status_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_subscription_status_check
      check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));
  end if;
end $$;

alter table public.candidates
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists data_retention_until timestamptz;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_workspace_created_idx
  on public.audit_logs (workspace_id, created_at desc);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  feature text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_feature_check check (feature in ('jobs', 'candidates', 'members', 'aiScreenings')),
  constraint usage_events_quantity_check check (quantity > 0)
);

create index if not exists usage_events_workspace_feature_created_idx
  on public.usage_events (workspace_id, feature, created_at desc);

alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "audit_logs_select_workspace" on public.audit_logs;
create policy "audit_logs_select_workspace"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "audit_logs_insert_workspace" on public.audit_logs;
create policy "audit_logs_insert_workspace"
  on public.audit_logs
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "usage_events_select_workspace" on public.usage_events;
create policy "usage_events_select_workspace"
  on public.usage_events
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "usage_events_insert_workspace" on public.usage_events;
create policy "usage_events_insert_workspace"
  on public.usage_events
  for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));
