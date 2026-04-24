-- HireSync AI company profile fields
-- Run after the main foundation migration.

alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_website text,
  add column if not exists company_tagline text;

create index if not exists profiles_role_idx on public.profiles (role);
