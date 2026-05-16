import { AppShell } from "@/components/app/app-shell";
import { SettingsPage } from "@/components/settings/settings-page";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="settings" crumb="Settings">
      <SettingsPage data={data} authState={params.auth} />
    </AppShell>
  );
}
