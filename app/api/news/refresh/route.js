import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

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

    await supabase.from("fetch_log").insert({
      tier: "rss",
      queries_used: feedCount, // feeds polled; RSS has no quota, kept for diagnostics
      fetched: stories.length,
      inserted,
      errors,
      triggered_by: auth.by,
    });

    return NextResponse.json({ ok: true, feeds: feedCount, fetched: stories.length, inserted, errors });
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
