# War Room — Rapid Response Desk

Political intelligence and rapid-response tool for a comms team. Monitors news
and helps decide how (and whether) to respond on social media.

Built with Next.js (App Router). The React UI and the API routes live in one
app so API keys stay server-side.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file from the template and add your keys:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `OPENAI_API_KEY` (your GPT key). `OPENAI_MODEL` defaults to `gpt-4o`.
3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## How it's wired

- **UI** (`app/page.jsx` + `components/`) — the editorial War Room interface.
- **`/api/analyze`** — sends a headline + political lens to GPT, returns
  risk / importance / posture / 3 angles as structured JSON.
- **`/api/generate`** — sends the chosen angle + tone to GPT, returns X and
  Facebook drafts (plain English, no em-dashes, X under 280).
- Keys are read from the environment inside `lib/openai.js` and never reach the
  browser.

## Not built yet (later steps)

- Live news feed from NewsData.io (currently `lib/demoFeed.js`).
- Supabase persistence + email login (lens, analyzed stories, statement history).
- Scheduled news fetch via Vercel Cron.

## Design

The visual design (cream `#faf9f6`, ink `#14141a`, red accent `#b8342a`, sharp
editorial cards) is preserved from the original prototype. Global styles live in
`app/globals.css`.
