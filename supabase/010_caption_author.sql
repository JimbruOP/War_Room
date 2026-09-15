-- Record who saved each caption, by name, so the Saved list can show it.
-- We stamp the name at save time because the browser client can't read other
-- users' auth metadata. Add-only, safe to re-run.

alter table public.caption_history
  add column if not exists created_by_name text;
