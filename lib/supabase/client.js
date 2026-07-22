import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Browser-side Supabase client (uses the public anon key + RLS).
// Returns null when Supabase isn't configured, so callers can fall back.
export function createSupabaseBrowser() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
