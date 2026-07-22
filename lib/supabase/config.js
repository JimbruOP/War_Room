// Central Supabase config. `isSupabaseConfigured` lets the whole app degrade
// gracefully to "local mode" (no login, in-memory lens) until the project keys
// are added to .env.local.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
