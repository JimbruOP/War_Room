-- Store a whole generation as one entry: the reel idea plus all 4 options.
-- Add-only, safe to re-run.

alter table public.caption_history
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists source  text;
