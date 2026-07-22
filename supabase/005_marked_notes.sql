-- Lets a marked story carry your own note, and survive the 24h feed window.
-- Run in the Supabase SQL Editor. Safe to re-run.

alter table public.story_feedback
  add column if not exists note   text,
  -- Snapshot the link and outlet alongside the headline, so a marked story
  -- stays readable and clickable even after the story row is deleted or the
  -- article drops out of the live feed.
  add column if not exists url    text,
  add column if not exists source text;

create index if not exists story_feedback_mine_idx
  on public.story_feedback (created_by, signal, created_at desc);
