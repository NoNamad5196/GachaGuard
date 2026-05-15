import { AppShell } from "@/components/app/app-shell";
import { BannersPage } from "@/components/banners/banners-page";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function BannersRoute() {
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="banners" crumb="Banners">
      <BannersPage data={data} />
    </AppShell>
  );
}
