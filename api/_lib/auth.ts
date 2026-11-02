import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { HttpError, getBearerToken } from "./http.js";
import type { ApiRequest, ServerEnv } from "./http.js";

export interface AuthedContext {
  /** Supabase client that runs every query as the calling user (RLS applies). */
  supabase: SupabaseClient;
  user: User;
}

function getSupabaseConfig(env: ServerEnv) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) {
    // Misconfiguration is a server problem; the generic 500 handler logs it.
    throw new Error("Supabase URL / anon key are not configured on the server");
  }
  return { url, anonKey };
}

/**
 * Requires a valid Supabase access token in `Authorization: Bearer <token>`.
 * Throws HttpError(401) when the token is missing or rejected by Supabase.
 */
export async function authenticate(req: ApiRequest, env: ServerEnv): Promise<AuthedContext> {
  const token = getBearerToken(req);
  const { url, anonKey } = getSupabaseConfig(env);

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Invalid or expired token");

  return { supabase, user: data.user };
}
