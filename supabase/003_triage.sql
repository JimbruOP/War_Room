-- Adds automatic triage scoring so the feed can rank stories by what matters
-- to this candidate, instead of showing everything in clock order.
-- Run in the Supabase SQL Editor. Safe to re-run.

alter table public.stories
  add column if not exists triage_score int,          -- 0-100 relevance to the lens
  add column if not exists triage_reason text,        -- short "why", shown on hover
  add column if not exists is_tragedy boolean default false,
  add column if not exists triaged_at timestamptz;

-- Feed reads "recent, best first", so index that path.
create index if not exists stories_rank_idx
  on public.stories (published_at desc, triage_score desc nulls last);

-- The triage job looks for untriaged recent stories.
create index if not exists stories_untriaged_idx
  on public.stories (triaged_at, published_at desc)
  where triaged_at is null;
