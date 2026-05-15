import { AppShell } from "@/components/app/app-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function DashboardPage() {
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="dashboard" crumb="Dashboard">
      <DashboardShell data={data} />
    </AppShell>
  );
}
