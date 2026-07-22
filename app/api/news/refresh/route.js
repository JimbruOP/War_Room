import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss";
import { triageStories } from "@/lib/triage";
import { DEFAULT_LENS } from "@/lib/constants";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

// Triage is conditioned on the team's saved lens, so read it server-side.
async function loadLens(supabase) {
  const { data } = await supabase
    .from("political_lens")
    .select("candidate, party, constituency, allies, rivals, notes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || DEFAULT_LENS;
}

export const runtime = "nodejs";
export const maxDuration = 60;

// Two callers are allowed:
//   1. The scheduler, carrying "Authorization: Bearer <CRON_SECRET>"
//   2. A signed-in team member clicking "Refresh now"
async function authorize(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return { ok: true, by: "cron" };

  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: !secret, by: "manual" }; // local mode, no auth configured
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { ok: true, by: "manual" };

  return { ok: false };
}

export async function GET(request) {
  const auth = await authorize(request);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { stories, errors, feedCount } = await fetchAllFeeds();

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not set — cannot write stories." },
        { status: 500 }
      );
    }

    let inserted = 0;
    if (stories.length) {
      const { data, error } = await supabase
        .from("stories")
        .upsert(stories, { onConflict: "url_hash", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted = data?.length ?? 0;
    }

    // ---- Triage: score anything recent that hasn't been scored yet ----
    // Runs after the upsert so newly inserted rows are included, and is capped
    // so one huge backlog can't blow the function's time limit.
    const triageErrors = [];
    let triaged = 0;
    let triageUsage = null;
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: pending } = await supabase
        .from("stories")
        .select("id, headline")
        .is("triaged_at", null)
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(200);

      if (pending?.length) {
        const lens = await loadLens(supabase);
        const { scored, errors: tErrors, usage } = await triageStories(lens, pending);
        triageErrors.push(...tErrors);
        triageUsage = usage;

        // Write scores back in parallel waves. Doing these one at a time meant
        // 200 sequential round-trips and pushed the whole request past 60s,
        // which would time out on Vercel.
        const WRITE_CONCURRENCY = 25;
        for (let i = 0; i < scored.length; i += WRITE_CONCURRENCY) {
          await Promise.all(
            scored.slice(i, i + WRITE_CONCURRENCY).map(({ id, ...fields }) =>
              supabase.from("stories").update(fields).eq("id", id)
            )
          );
        }
        triaged = scored.length;
      }
    } catch (err) {
      console.error("[refresh] triage failed", err);
      triageErrors.push(`triage: ${err.message}`);
    }

    await supabase.from("fetch_log").insert({
      tier: "rss",
      queries_used: feedCount, // feeds polled; RSS has no quota, kept for diagnostics
      fetched: stories.length,
      inserted,
      errors: [...errors, ...triageErrors],
      triggered_by: auth.by,
    });

    return NextResponse.json({
      ok: true,
      feeds: feedCount,
      fetched: stories.length,
      inserted,
      triaged,
      triageUsage,
      errors: [...errors, ...triageErrors],
    });
  } catch (err) {
    console.error("[/api/news/refresh]", err);
    try {
      const admin = createSupabaseAdmin();
      await admin?.from("fetch_log").insert({
        tier: "rss",
        queries_used: 0,
        fetched: 0,
        inserted: 0,
        errors: [err.message || "unknown error"],
        triggered_by: auth.by,
      });
    } catch {
      /* logging must never mask the original error */
    }
    return NextResponse.json({ error: err.message || "Refresh failed." }, { status: 500 });
  }
}
