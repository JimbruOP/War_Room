import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Service-role client — bypasses RLS. Used ONLY by the scheduled news fetch,
// which has no logged-in user to act as. This key must never be exposed to
// the browser (note: no NEXT_PUBLIC_ prefix).
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
