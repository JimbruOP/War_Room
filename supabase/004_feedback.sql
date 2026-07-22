-- Teaches the triage ranker what this team actually cares about.
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.story_feedback (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid references public.stories (id) on delete set null,
  -- Headline is snapshotted so the lesson survives the story being deleted
  -- or ageing out of the feed.
  headline    text not null,
  rating      text not null,                       -- top | fine | ignore
  signal      text not null default 'explicit',    -- explicit | assessed | generated
  ai_score    int,                                 -- what triage guessed, for comparison
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

-- One rating per person per story per signal type, so re-rating overwrites
-- instead of piling up duplicates.
create unique index if not exists story_feedback_unique_idx
  on public.story_feedback (story_id, created_by, signal);

create index if not exists story_feedback_recent_idx
  on public.story_feedback (created_at desc);

alter table public.story_feedback enable row level security;

drop policy if exists "team access" on public.story_feedback;
create policy "team access" on public.story_feedback
  for all to authenticated using (true) with check (true);
