alter table public.candidates
  add column if not exists job_title_snapshot text,
  add column if not exists company_name_snapshot text;

update public.candidates as c
set
  job_title_snapshot = coalesce(c.job_title_snapshot, j.title),
  company_name_snapshot = coalesce(c.company_name_snapshot, w.name)
from public.jobs as j
left join public.workspaces as w
  on w.id = j.workspace_id
where c.job_id = j.id;

drop policy if exists "jobs_public_read_published" on public.jobs;
create policy "jobs_public_read_published"
  on public.jobs
  for select
  to anon, authenticated
  using (lower(coalesce(status, 'draft')) = 'published');

drop policy if exists "workspaces_public_read_for_published_jobs" on public.workspaces;
create policy "workspaces_public_read_for_published_jobs"
  on public.workspaces
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.jobs
      where jobs.workspace_id = workspaces.id
        and lower(coalesce(jobs.status, 'draft')) = 'published'
    )
  );

drop policy if exists "candidates_insert_career_site" on public.candidates;
create policy "candidates_insert_career_site"
  on public.candidates
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and source = 'career-site'
    and workspace_id is not null
  );
