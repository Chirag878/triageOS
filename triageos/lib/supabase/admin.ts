import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/config/env";

export function createAdminClient() {
  const env = getServerEnv();

  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
