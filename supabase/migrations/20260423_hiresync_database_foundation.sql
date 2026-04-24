-- HireSync AI database foundation
-- Run this in Supabase SQL Editor on the same project/database used by the app.

create extension if not exists pgcrypto;

-- 1. Profiles table for a canonical app role
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'candidate'))
);

insert into public.profiles (id, full_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', split_part(users.email, '@', 1)),
  'candidate'
from auth.users as users
on conflict (id) do nothing;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'candidate'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created_profile'
  ) then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row execute procedure public.handle_new_profile();
  end if;
end $$;

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
  );
$$;

-- 2. Jobs hardening
alter table public.jobs
  add column if not exists location text,
  add column if not exists employment_type text,
  add column if not exists department text,
  add column if not exists status text,
  add column if not exists slug text,
  add column if not exists created_at timestamptz not null default now();

update public.jobs
set status = case
  when status is null or btrim(status) = '' then 'draft'
  when lower(btrim(status)) in ('open', 'active') then 'published'
  when lower(btrim(status)) in ('closed') then 'archived'
  else lower(btrim(status))
end;

alter table public.jobs
  alter column status set default 'draft';

create index if not exists jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index if not exists jobs_status_created_idx on public.jobs (status, created_at desc);

-- 3. Candidates hardening
alter table public.candidates
  add column if not exists processing_error text,
  add column if not exists seniority text,
  add column if not exists skills text[],
  add column if not exists summary text,
  add column if not exists red_flags text[],
  add column if not exists interview_questions text,
  add column if not exists location text,
  add column if not exists salary_expectation text,
  add column if not exists availability text,
  add column if not exists source text,
  add column if not exists source_filename text,
  add column if not exists resume_file_path text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.candidates'::regclass
      and conname = 'candidates_status_check'
  ) then
    alter table public.candidates drop constraint candidates_status_check;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.candidates'::regclass
      and conname = 'candidates_processing_status_check'
  ) then
    alter table public.candidates drop constraint candidates_processing_status_check;
  end if;
end $$;

update public.candidates
set status = case
  when status is null or btrim(status) = '' or lower(btrim(status)) = 'new' then 'applied'
  else lower(btrim(status))
end;

update public.candidates
set processing_status = null
where processing_status is not null
  and processing_status not in ('queued', 'processing', 'done', 'failed');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.candidates'::regclass
      and conname = 'candidates_status_check'
  ) then
    alter table public.candidates
      add constraint candidates_status_check
      check (status in ('applied', 'screening', 'interview', 'final', 'hired', 'rejected'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.candidates'::regclass
      and conname = 'candidates_processing_status_check'
  ) then
    alter table public.candidates
      add constraint candidates_processing_status_check
      check (
        processing_status is null
        or processing_status in ('queued', 'processing', 'done', 'failed')
      );
  end if;
end $$;

create index if not exists candidates_job_created_idx on public.candidates (job_id, created_at desc);
create index if not exists candidates_job_processing_idx on public.candidates (job_id, processing_status);
create index if not exists candidates_user_created_idx on public.candidates (user_id, created_at desc);

create unique index if not exists candidates_unique_career_site_application_idx
  on public.candidates (user_id, job_id)
  where source = 'career-site';

-- 4. Candidate notes hardening
alter table public.candidate_notes
  add column if not exists created_at timestamptz not null default now();

create index if not exists candidate_notes_candidate_created_idx
  on public.candidate_notes (candidate_id, created_at desc);

-- 5. Foreign keys
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidates_job_id_fkey'
  ) then
    alter table public.candidates
      add constraint candidates_job_id_fkey
      foreign key (job_id)
      references public.jobs (id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidate_notes_candidate_id_fkey'
  ) then
    alter table public.candidate_notes
      add constraint candidate_notes_candidate_id_fkey
      foreign key (candidate_id)
      references public.candidates (id)
      on delete cascade;
  end if;
end $$;

-- 6. RLS
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_notes enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "jobs_admin_all" on public.jobs;
create policy "jobs_admin_all"
  on public.jobs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "candidates_admin_all" on public.candidates;
create policy "candidates_admin_all"
  on public.candidates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "candidates_select_own" on public.candidates;
create policy "candidates_select_own"
  on public.candidates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "candidates_insert_own" on public.candidates;
create policy "candidates_insert_own"
  on public.candidates
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "candidate_notes_admin_all" on public.candidate_notes;
create policy "candidate_notes_admin_all"
  on public.candidate_notes
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 7. Important follow-up after running this migration:
-- Update your own profile row to role = 'admin'
-- Example:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
