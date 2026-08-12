-- Caption history: saved Instagram captions with a title (what they were for)
-- and a date. Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.caption_history (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',   -- e.g. "Independence Day reel"
  caption_text  text not null,
  hashtags      jsonb not null default '[]'::jsonb,
  malayalam     text,
  style         text,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now()
);

create index if not exists caption_history_recent_idx
  on public.caption_history (created_at desc);

alter table public.caption_history enable row level security;

drop policy if exists "team access" on public.caption_history;
create policy "team access" on public.caption_history
  for all to authenticated using (true) with check (true);
