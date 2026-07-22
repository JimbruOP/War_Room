-- Saving a story for later is a DIFFERENT action from rating its priority.
--   story_feedback = teaching the ranker (Top / Fine / Ignore). Invisible.
--   saved_stories  = your own shelf. Deliberate, with a note, kept indefinitely.
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.saved_stories (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid references public.stories (id) on delete set null,
  -- Snapshotted so a saved story stays readable and clickable long after the
  -- article leaves the 24h feed or the row is cleaned up.
  headline    text not null,
  url         text,
  source      text,
  note        text,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create unique index if not exists saved_stories_unique_idx
  on public.saved_stories (story_id, created_by);

create index if not exists saved_stories_mine_idx
  on public.saved_stories (created_by, created_at desc);

alter table public.saved_stories enable row level security;

drop policy if exists "team access" on public.saved_stories;
create policy "team access" on public.saved_stories
  for all to authenticated using (true) with check (true);

-- The note column on story_feedback is no longer used; notes live on
-- saved_stories now. Left in place so nothing already written is lost.
