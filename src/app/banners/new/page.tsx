import { AppShell } from "@/components/app/app-shell";
import { CustomBannerForm } from "@/components/banners/custom-banner-form";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function NewBannerRoute() {
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="banners" crumb="Banners / New" authNextPath="/banners/new">
      <CustomBannerForm data={data} />
    </AppShell>
  );
}
