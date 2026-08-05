-- Tracks which stories have already fired a push alert, so a story never
-- notifies twice (and a rescore doesn't re-alert everything).
-- Run in the Supabase SQL Editor. Safe to re-run.

alter table public.stories
  add column if not exists notified_at timestamptz;

create index if not exists stories_to_notify_idx
  on public.stories (triage_score desc, published_at desc)
  where notified_at is null;
