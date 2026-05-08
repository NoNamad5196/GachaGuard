import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data && hasSupabaseEnv()) {
    redirect("/");
  }

  if (!data) {
    return null;
  }

  return <DashboardShell data={data} />;
}
