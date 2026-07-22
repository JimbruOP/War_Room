// Read/write the single shared political_lens row via the browser Supabase
// client. All calls no-op safely when `supabase` is null (local mode).

const LENS_FIELDS = ["candidate", "party", "constituency", "allies", "rivals", "notes"];

export async function fetchLens(supabase) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("political_lens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveLens(supabase, lens) {
  if (!supabase) return;
  const payload = {};
  for (const f of LENS_FIELDS) payload[f] = lens[f] ?? "";
  payload.updated_at = new Date().toISOString();

  const { data: existing, error: readErr } = await supabase
    .from("political_lens")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing) {
    const { error } = await supabase
      .from("political_lens")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("political_lens").insert(payload);
    if (error) throw error;
  }
}
