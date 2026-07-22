-- War Room database schema.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses "if not exists" and idempotent policies/seed.

-- ---------- political_lens: one shared row for the whole team ----------
create table if not exists public.political_lens (
  id            uuid primary key default gen_random_uuid(),
  candidate     text not null default '',
  party         text not null default '',
  constituency  text not null default '',
  allies        text not null default '',
  rivals        text not null default '',
  notes         text not null default '',
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id)
);

-- ---------- stories: fetched (automation) or manual entries ----------
create table if not exists public.stories (
  id            uuid primary key default gen_random_uuid(),
  url_hash      text unique,               -- dedupe key for the news feed
  category      text not null,             -- kerala | indian | intl | sports | manual
  headline      text not null,
  source        text,
  url           text,
  published_at  timestamptz,
  fetched_at    timestamptz not null default now(),
  is_manual     boolean not null default false,
  created_by    uuid references auth.users (id)
);

-- ---------- analyses: one row per assessment of a story ----------
create table if not exists public.analyses (
  id             uuid primary key default gen_random_uuid(),
  story_id       uuid references public.stories (id) on delete cascade,
  risk           text not null,            -- low | medium | high
  risk_reason    text,
  importance     int,                      -- 0-100
  posture        text,                     -- attack | align | condolence | celebrate | stay_silent
  posture_reason text,
  angles         jsonb not null default '[]'::jsonb,
  model          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id)
);

-- ---------- statements: generated X + Facebook drafts + post history ----------
create table if not exists public.statements (
  id             uuid primary key default gen_random_uuid(),
  story_id       uuid references public.stories (id) on delete set null,
  analysis_id    uuid references public.analyses (id) on delete set null,
  headline       text,
  chosen_angle   jsonb,
  tone           text,
  x_text         text,
  facebook_text  text,
  x_char_count   int,
  status         text not null default 'draft',   -- draft | posted
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  posted_at      timestamptz
);

-- ---------- Row Level Security: shared workspace ----------
-- Every signed-in team member can read and write everything.
-- (For a 3-5 person comms desk sharing one workspace, this is the right model.)
alter table public.political_lens enable row level security;
alter table public.stories        enable row level security;
alter table public.analyses       enable row level security;
alter table public.statements     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['political_lens','stories','analyses','statements'] loop
    execute format('drop policy if exists "team access" on public.%I;', t);
    execute format(
      'create policy "team access" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ---------- Seed the lens with the default candidate ----------
insert into public.political_lens (candidate, party, constituency, allies, rivals, notes)
select
  'Shoba Surendran',
  'BJP',
  'Alappuzha (Lok Sabha 2029 target)',
  'BJP, NDA, Union Government (Centre)',
  'UDF (Congress/INC, IUML), LDF (CPM/CPI)',
  'Hindu-consolidation + coastal (Dheevara) base. Pro-Centre, Make-in-India, development & accountability framing. Avoid attacking during active tragedies. Watch: attacking a UDF minister is fair game for BJP.'
where not exists (select 1 from public.political_lens);
