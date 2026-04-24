-- HireSync AI workspace foundation
-- Run after the main foundation migration.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  website text,
  tagline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_owner_user_id_idx on public.workspaces (owner_user_id);
create index if not exists workspaces_created_idx on public.workspaces (created_at desc);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  role text not null default 'recruiter',
  status text not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('owner', 'recruiter')),
  constraint workspace_members_status_check check (status in ('active', 'inactive'))
);

create unique index if not exists workspace_members_workspace_user_idx
  on public.workspace_members (workspace_id, user_id);
create index if not exists workspace_members_user_status_idx
  on public.workspace_members (user_id, status);
create index if not exists workspace_members_workspace_status_idx
  on public.workspace_members (workspace_id, status);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'recruiter',
  invite_code text not null,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workspace_invites_role_check check (role in ('owner', 'recruiter'))
);

create unique index if not exists workspace_invites_invite_code_idx
  on public.workspace_invites (invite_code);
create index if not exists workspace_invites_workspace_created_idx
  on public.workspace_invites (workspace_id, created_at desc);

alter table public.profiles
  add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;

alter table public.jobs
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

alter table public.candidates
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

alter table public.candidate_notes
  add column if not exists workspace_id uuid references public.workspaces (id) on delete cascade;

create index if not exists profiles_workspace_idx on public.profiles (workspace_id);
create index if not exists jobs_workspace_created_idx on public.jobs (workspace_id, created_at desc);
create index if not exists candidates_workspace_created_idx on public.candidates (workspace_id, created_at desc);
create index if not exists candidate_notes_workspace_created_idx
  on public.candidate_notes (workspace_id, created_at desc);

insert into public.workspaces (owner_user_id, name)
select
  source.user_id,
  source.workspace_name
from (
  select distinct
    u.id as user_id,
    case
      when p.full_name is not null and btrim(p.full_name) <> '' then p.full_name || ' workspace'
      when u.email is not null and split_part(u.email, '@', 1) <> '' then split_part(u.email, '@', 1) || ' workspace'
      else 'HireSync workspace'
    end as workspace_name
  from auth.users as u
  left join public.profiles as p
    on p.id = u.id
  left join public.jobs as j
    on j.user_id = u.id
  where coalesce(p.role, 'candidate') = 'admin'
     or j.user_id is not null
) as source
where not exists (
  select 1
  from public.workspaces as existing
  where existing.owner_user_id = source.user_id
);

insert into public.workspace_members (workspace_id, user_id, email, role, status, invited_by)
select
  w.id,
  w.owner_user_id,
  u.email,
  'owner',
  'active',
  w.owner_user_id
from public.workspaces as w
join auth.users as u
  on u.id = w.owner_user_id
on conflict (workspace_id, user_id) do update
set
  email = excluded.email,
  role = 'owner',
  status = 'active';

update public.profiles as p
set
  workspace_id = w.id,
  role = 'admin'
from public.workspaces as w
where w.owner_user_id = p.id
  and (p.workspace_id is distinct from w.id or p.role is distinct from 'admin');

update public.jobs as j
set workspace_id = w.id
from public.workspaces as w
where w.owner_user_id = j.user_id
  and j.workspace_id is null;

update public.candidates as c
set workspace_id = j.workspace_id
from public.jobs as j
where j.id = c.job_id
  and c.workspace_id is null;

update public.candidate_notes as n
set workspace_id = c.workspace_id
from public.candidates as c
where c.id = n.candidate_id
  and n.workspace_id is null;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and status = 'active'
  ) or exists (
    select 1
    from public.workspaces
    where id = target_workspace
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'recruiter')
  ) or exists (
    select 1
    from public.workspaces
    where id = target_workspace
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) or exists (
    select 1
    from public.workspace_members
    where user_id = auth.uid()
      and status = 'active'
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_select_self_or_workspace" on public.profiles;
drop policy if exists "profiles_update_self_or_workspace" on public.profiles;

create policy "profiles_select_self_or_workspace"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or (
      workspace_id is not null
      and public.is_workspace_member(workspace_id)
    )
  );

create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_self_or_workspace"
  on public.profiles
  for update
  to authenticated
  using (
    auth.uid() = id
    or (
      workspace_id is not null
      and public.is_workspace_admin(workspace_id)
    )
  )
  with check (
    auth.uid() = id
    or (
      workspace_id is not null
      and public.is_workspace_admin(workspace_id)
    )
  );

drop policy if exists "jobs_admin_all" on public.jobs;
drop policy if exists "jobs_select_workspace" on public.jobs;
drop policy if exists "jobs_insert_workspace" on public.jobs;
drop policy if exists "jobs_update_workspace" on public.jobs;
drop policy if exists "jobs_delete_workspace" on public.jobs;

create policy "jobs_select_workspace"
  on public.jobs
  for select
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  );

create policy "jobs_insert_workspace"
  on public.jobs
  for insert
  to authenticated
  with check (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

create policy "jobs_update_workspace"
  on public.jobs
  for update
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
  with check (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

create policy "jobs_delete_workspace"
  on public.jobs
  for delete
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "candidates_admin_all" on public.candidates;
drop policy if exists "candidates_select_own" on public.candidates;
drop policy if exists "candidates_insert_own" on public.candidates;
drop policy if exists "candidates_select_workspace" on public.candidates;
drop policy if exists "candidates_insert_workspace" on public.candidates;
drop policy if exists "candidates_update_workspace" on public.candidates;
drop policy if exists "candidates_delete_workspace" on public.candidates;

create policy "candidates_select_workspace"
  on public.candidates
  for select
  to authenticated
  using (
    (
      workspace_id is not null
      and public.is_workspace_member(workspace_id)
    )
    or auth.uid() = user_id
  );

create policy "candidates_insert_workspace"
  on public.candidates
  for insert
  to authenticated
  with check (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

create policy "candidates_update_workspace"
  on public.candidates
  for update
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  )
  with check (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  );

create policy "candidates_delete_workspace"
  on public.candidates
  for delete
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "candidate_notes_admin_all" on public.candidate_notes;
drop policy if exists "candidate_notes_select_workspace" on public.candidate_notes;
drop policy if exists "candidate_notes_insert_workspace" on public.candidate_notes;
drop policy if exists "candidate_notes_update_workspace" on public.candidate_notes;
drop policy if exists "candidate_notes_delete_workspace" on public.candidate_notes;

create policy "candidate_notes_select_workspace"
  on public.candidate_notes
  for select
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  );

create policy "candidate_notes_insert_workspace"
  on public.candidate_notes
  for insert
  to authenticated
  with check (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  );

create policy "candidate_notes_update_workspace"
  on public.candidate_notes
  for update
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  )
  with check (
    workspace_id is not null
    and public.is_workspace_member(workspace_id)
  );

create policy "candidate_notes_delete_workspace"
  on public.candidate_notes
  for delete
  to authenticated
  using (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  );

drop policy if exists "workspaces_select_member" on public.workspaces;
drop policy if exists "workspaces_insert_owner" on public.workspaces;
drop policy if exists "workspaces_update_member" on public.workspaces;

create policy "workspaces_select_member"
  on public.workspaces
  for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces_insert_owner"
  on public.workspaces
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "workspaces_update_member"
  on public.workspaces
  for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

drop policy if exists "workspace_members_select_member" on public.workspace_members;
drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
drop policy if exists "workspace_members_update_admin" on public.workspace_members;
drop policy if exists "workspace_members_delete_admin" on public.workspace_members;

create policy "workspace_members_select_member"
  on public.workspace_members
  for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_admin"
  on public.workspace_members
  for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members_update_admin"
  on public.workspace_members
  for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members_delete_admin"
  on public.workspace_members
  for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "workspace_invites_select_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_insert_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_update_admin" on public.workspace_invites;
drop policy if exists "workspace_invites_delete_admin" on public.workspace_invites;

create policy "workspace_invites_select_admin"
  on public.workspace_invites
  for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "workspace_invites_insert_admin"
  on public.workspace_invites
  for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_invites_update_admin"
  on public.workspace_invites
  for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_invites_delete_admin"
  on public.workspace_invites
  for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));
