import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { BannerDetailPage } from "@/components/banners/banner-detail-page";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function BannerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, data] = await Promise.all([params, getAppDataOrRedirect()]);
  const banner = data.banners.find((item) => item.id === id);

  if (!banner) {
    notFound();
  }

  return (
    <AppShell data={data} active="banners" crumb={`Banners / ${banner.name}`}>
      <BannerDetailPage data={data} banner={banner} />
    </AppShell>
  );
}
