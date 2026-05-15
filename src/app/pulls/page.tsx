import { AppShell } from "@/components/app/app-shell";
import { PullLogClient } from "@/components/pulls/pull-log-client";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function PullsPage() {
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="pulls" crumb="Pull Log">
      <PullLogClient data={data} />
    </AppShell>
  );
}
