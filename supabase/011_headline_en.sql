-- Literal English translation of a Malayalam (or other non-English) headline,
-- filled in by the triage AI in the same pass that scores it. Empty/null for
-- headlines already in English. Add-only, safe to re-run.

alter table public.stories
  add column if not exists headline_en text;
