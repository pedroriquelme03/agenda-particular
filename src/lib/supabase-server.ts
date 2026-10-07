import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

// Client that acts as the signed-in user, so row-level security applies to it.
function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The user behind an API request, or null when the token is missing or invalid.
export async function getRequestUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const client = createUserClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, client };
}
