import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Header that identifies the signed-in user to this app's own API routes.
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}
