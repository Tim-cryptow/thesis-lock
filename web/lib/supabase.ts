import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key. Import this from
// server code only (the chainhook route). The key is read from a non-public env
// var, so Next never inlines it into client bundles; importing this from a
// client component would find the env undefined and throw rather than leak it.

let client: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

// Lazily construct a single service-role client. Lazy (not at module load) so a
// missing env var surfaces only when a write is attempted, never breaking
// unrelated imports or the build.
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  client = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
