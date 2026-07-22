# Deploying War Room

Target stack: **Vercel** (app + API routes + cron) and **Supabase** (database + auth),
which is already what you're running locally.

---

## 1. Push the code to GitHub

This folder is its own git repository, deliberately separate from the
`Dany x Claude` folder (which contains 11 unrelated projects). Vercel deploys a
whole repo, so War Room needs its own.

Create an **empty private repo** on GitHub called `war-room`, then:

```bash
git remote add origin https://github.com/<your-username>/war-room.git
git branch -M main
git push -u origin main
```

`.env.local` is gitignored and will not be uploaded. Verify before pushing:

```bash
git status --porcelain | grep env
```

That must print nothing.

---

## 2. Create the Vercel project

1. vercel.com → **Add New → Project** → import the `war-room` repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings alone.
3. **Do not deploy yet** — add the environment variables first (next step).

---

## 3. Environment variables

In Vercel → Project → **Settings → Environment Variables**, add each of these for
**Production, Preview, and Development**:

| Name | Where it comes from | Exposed to browser? |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com | No |
| `OPENAI_MODEL` | `gpt-4o` | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Yes (safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (`service_role`) | **No — never** |
| `CRON_SECRET` | the value in your `.env.local` | No |

Copy them from your local `.env.local`. Only the two `NEXT_PUBLIC_` ones are
meant to reach the browser; the rest must stay server-side.

---

## 4. Point Supabase auth at the live domain

Magic-link login will fail on the deployed site until you do this.

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://<your-project>.vercel.app`
- **Redirect URLs**: add both
  - `https://<your-project>.vercel.app/**`
  - `http://localhost:3000/**` (keep, so local dev still works)

If you later add a custom domain, add that too.

---

## 5. The cron problem — read this before you pick a plan

`vercel.json` polls `/api/news/refresh` **every 15 minutes**. RSS has no quota,
so frequency costs nothing; the only limit is your hosting plan.

**Vercel's free Hobby plan only runs cron jobs once per day.** Anything more
frequent needs Pro ($20/month). Three options:

### Option A — external scheduler (free, recommended to start)
Delete the `crons` block from `vercel.json`, then use a free service like
[cron-job.org](https://cron-job.org) to call:

```
https://<your-project>.vercel.app/api/news/refresh
```

with header `Authorization: Bearer <your CRON_SECRET>`, every 15 minutes.

Identical to what Vercel Cron would do — the endpoint doesn't care who calls it
as long as the secret matches.

### Option B — Vercel Pro
$20/month. `vercel.json` works as written, nothing to change.

### Option C — accept daily
Leave it on Hobby with a once-daily schedule. Too slow for genuine rapid
response, but fine while testing.

You can always hit **Refresh now** in the UI manually, on any plan.

### Why RSS and not a news API
NewsData.io's free tier delays every article by **at least 12 hours** — measured
across 80 stored stories the fastest was 12.1h and not one arrived sooner. The
RSS feeds in `lib/rss.js` deliver the same stories in **about 5 minutes**, free
and unmetered. Run `node scripts/probe-feeds.mjs` to check every feed's health
and freshness if the feed ever looks stale.

---

## 6. After the first deploy

- [ ] Sign in with your magic link on the live URL
- [ ] Confirm the feed shows real stories (not the demo fallback)
- [ ] Open the Political lens, save an edit, reload — it should persist
- [ ] Click **Refresh now** and confirm new stories appear
- [ ] Assess a story, reload the page, confirm the assessment survived
- [ ] Generate a statement, then check the `statements` table in Supabase

---

## 7. Security housekeeping

**Rotate the keys that were shared in chat**, since they now exist in a
transcript:

- OpenAI: platform.openai.com → API keys → create new, delete old
- Supabase: Settings → API → rotate the `service_role` key

Update both in Vercel and in your local `.env.local` afterwards.

Also, once your team is invited: Supabase → Authentication → Providers → Email →
turn **off** "Allow new users to sign up", so only invited addresses can get in.
