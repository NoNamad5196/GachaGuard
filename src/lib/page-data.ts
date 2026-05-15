import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/dashboard-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function getAppDataOrRedirect() {
  const data = await getDashboardData();

  if (!data && hasSupabaseEnv()) {
    redirect("/");
  }

  if (!data) {
    throw new Error("Dashboard data is unavailable.");
  }

  return data;
}
