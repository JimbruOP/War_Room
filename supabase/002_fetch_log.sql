-- Records every news fetch so the UI can show last-fetch time and how many
-- NewsData credits have been spent today.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run.

create table if not exists public.fetch_log (
  id            uuid primary key default gen_random_uuid(),
  tier          text not null,                         -- core | wide | all
  queries_used  int  not null default 0,               -- = NewsData credits spent
  fetched       int  not null default 0,
  inserted      int  not null default 0,
  errors        jsonb not null default '[]'::jsonb,
  triggered_by  text not null default 'cron',          -- cron | manual
  created_at    timestamptz not null default now()
);

create index if not exists fetch_log_created_at_idx
  on public.fetch_log (created_at desc);

alter table public.fetch_log enable row level security;

drop policy if exists "team access" on public.fetch_log;
create policy "team access" on public.fetch_log
  for all to authenticated using (true) with check (true);
