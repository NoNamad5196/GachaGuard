import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/dashboard-data";
import { hasFirebaseEnv } from "@/lib/firebase/env";

export async function getAppDataOrRedirect() {
  const data = await getDashboardData();

  if (!data && hasFirebaseEnv()) {
    redirect("/");
  }

  if (!data) {
    throw new Error("Dashboard data is unavailable.");
  }

  return data;
}
