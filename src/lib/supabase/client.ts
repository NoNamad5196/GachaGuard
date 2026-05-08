"use client";

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createBrowserClient() {
  const { url, key } = getSupabaseEnv();
  return createSupabaseBrowserClient<Database>(url, key);
}
