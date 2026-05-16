import { AppShell } from "@/components/app/app-shell";
import { GoogleImportPage } from "@/components/imports/google-import-page";
import { getGoogleImportPageData } from "@/lib/google-payments/page-data";

export default async function GoogleImportRoute({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const { data, existingImportFingerprints } = await getGoogleImportPageData();

  return (
    <AppShell data={data} active="settings" crumb="Imports / Google" authNextPath="/imports/google">
      <GoogleImportPage
        data={data}
        existingImportFingerprints={existingImportFingerprints}
        authState={params.auth}
      />
    </AppShell>
  );
}
