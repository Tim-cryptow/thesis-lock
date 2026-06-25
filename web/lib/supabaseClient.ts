import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe Supabase client for reads. It uses the public anon key and the
// public-read RLS policy on thesis_locks, so it is safe in client components and
// in server code. This is deliberately separate from getSupabaseAdmin() in
// supabase.ts, which holds the service-role key (writes only) and must never
// reach the client bundle.
//
// Returns null when the public env vars are absent so every caller can degrade
// to the Hiro read path instead of erroring: reads never hard-depend on Supabase.

let client: SupabaseClient | null | undefined;

export function getSupabaseRead(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    client = null;
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
