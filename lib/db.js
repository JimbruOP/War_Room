// Data access for stories, analyses and statements.
// All functions take the browser Supabase client and no-op safely when it is
// null (local mode), so the UI can always fall back to the demo feed.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo-feed rows use numeric ids and offline manual entries use "manual-<ts>".
// Only a real UUID is a valid stories.id foreign key.
export function isStoryId(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

export function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Map a database row into the shape the feed UI already expects.
export function toFeedItem(row) {
  return {
    id: row.id,
    cat: row.category,
    headline: row.headline,
    source: row.source || "Unknown",
    time: timeAgo(row.published_at || row.fetched_at),
    url: row.url || null,
  };
}

// ---------- stories ----------
export async function fetchStories(supabase, limit = 80) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stories")
    .select("id, category, headline, source, url, published_at, fetched_at, is_manual")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function insertManualStory(supabase, headline) {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      category: "manual",
      headline,
      source: "Manual entry",
      is_manual: true,
      published_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- analyses ----------
// Returns { [storyId]: analysis } using the most recent analysis per story.
export async function fetchAnalyses(supabase, storyIds) {
  if (!supabase || !storyIds?.length) return {};
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .in("story_id", storyIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const out = {};
  for (const row of data || []) {
    if (out[row.story_id]) continue; // first row wins = most recent
    out[row.story_id] = {
      _id: row.id,
      risk: row.risk,
      risk_reason: row.risk_reason,
      importance: row.importance,
      posture: row.posture,
      posture_reason: row.posture_reason,
      angles: row.angles || [],
    };
  }
  return out;
}

export async function saveAnalysis(supabase, storyId, analysis, model) {
  if (!supabase || !isStoryId(storyId)) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      story_id: storyId,
      risk: analysis.risk,
      risk_reason: analysis.risk_reason,
      importance: analysis.importance,
      posture: analysis.posture,
      posture_reason: analysis.posture_reason,
      angles: analysis.angles ?? [],
      model: model || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

// ---------- fetch log ----------
// Reads straight from the browser (RLS allows any signed-in team member).
export async function fetchFeedStatus(supabase) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("fetch_log")
    .select("created_at, tier, queries_used, fetched, inserted, errors, triggered_by")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return { last: data || null };
}

// ---------- statements ----------
export async function saveStatement(supabase, payload) {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("statements")
    .insert({
      story_id: payload.storyId ?? null,
      analysis_id: payload.analysisId ?? null,
      headline: payload.headline ?? null,
      chosen_angle: payload.angle ?? null,
      tone: payload.tone ?? null,
      x_text: payload.x ?? null,
      facebook_text: payload.facebook ?? null,
      x_char_count: payload.x ? payload.x.length : null,
      status: "draft",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}
