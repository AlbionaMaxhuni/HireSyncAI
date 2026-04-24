-- HireSync AI outbound email tracking
-- Run after the workspace foundation migration.

alter table public.workspace_invites
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_email_id text,
  add column if not exists last_send_error text;

create index if not exists workspace_invites_last_sent_idx
  on public.workspace_invites (workspace_id, last_sent_at desc);
