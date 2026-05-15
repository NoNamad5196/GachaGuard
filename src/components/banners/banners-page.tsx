import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";

import { trackBanner } from "@/app/actions";
import {
  BANNER_TYPE_LABELS,
  formatKrw,
  formatPercent,
  getDaysUntil,
  getEstimatedCostToPity,
  getPityProgress,
  getRemainingPulls,
  probAt,
} from "@/lib/domain/calculations";
import type { BannerRecord, DashboardData, UserBanner } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import {
  DesignCard,
  EmptyState,
  ProgressBar,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";

export function BannersPage({ data }: { data: DashboardData }) {
  const trackedByBanner = new Map(data.userBanners.map((item) => [item.banner_id, item]));

  return (
    <div className="space-y-5" data-screen-label="Banners">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            활성 배너를 추적하고, 천장까지 남은 횟수와 비용을 비교합니다.
          </p>
        </div>
        <ToneBadge tone="info">{data.banners.length}개 활성 배너</ToneBadge>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.banners.map((banner) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            userBanner={trackedByBanner.get(banner.id)}
            isDemo={data.isDemo}
          />
        ))}
      </div>

      {data.banners.length === 0 ? (
        <EmptyState>등록된 활성 배너가 없습니다. seed나 관리자 데이터로 배너를 추가해 주세요.</EmptyState>
      ) : null}
    </div>
  );
}

function BannerCard({
  banner,
  userBanner,
  isDemo,
}: {
  banner: BannerRecord;
  userBanner?: UserBanner;
  isDemo: boolean;
}) {
  const pity = userBanner?.current_pity ?? 0;
  const remaining = getRemainingPulls(pity, banner.hard_pity);
  const progress = getPityProgress(pity, banner.hard_pity);
  const daysLeft = getDaysUntil(banner.ends_at);
  const nextChance = probAt(pity + 1, {
    baseRate: banner.base_rate,
    softPity: banner.soft_pity,
    hardPity: banner.hard_pity,
  });
  const estimatedCost = getEstimatedCostToPity(pity, banner.hard_pity, banner.games.base_cost);

  return (
    <DesignCard
      className="min-h-[300px]"
      bodyClassName="flex h-full flex-col gap-4"
    >
      <div className="rounded-lg border bg-[var(--surface-2)] p-4">
        <div className="flex items-center justify-between gap-3">
          <ToneBadge>{BANNER_TYPE_LABELS[banner.banner_type]}</ToneBadge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {daysLeft > 0 ? `${daysLeft}일 남음` : "종료 임박"}
          </span>
        </div>
        <div className="mt-8">
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            Featured
          </div>
          <h2 className="mt-1 text-xl font-semibold">{banner.featured}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{banner.games.name}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{banner.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              기본 {formatPercent(banner.base_rate)} · 픽업 {formatPercent(banner.rate_up, 0)}
            </p>
          </div>
          <ToneBadge tone={userBanner ? "safe" : "default"}>
            {userBanner ? "추적 중" : "미추적"}
          </ToneBadge>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>피티 {pity}/{banner.hard_pity}</span>
            <span>{remaining}회 남음</span>
          </div>
          <ProgressBar value={progress} tone={remaining <= 10 ? "danger" : "safe"} />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <StatBlock label="다음 5성 확률" value={formatPercent(nextChance)} />
        <StatBlock label="천장 예상 비용" value={formatKrw(estimatedCost)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href={`/banners/${banner.id}`}>
            상세
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {userBanner ? (
          <Button asChild>
            <Link href="/pulls">기록하기</Link>
          </Button>
        ) : (
          <form action={trackBanner}>
            <input type="hidden" name="bannerId" value={banner.id} />
            <Button type="submit" className="w-full" disabled={isDemo}>
              추적 시작
            </Button>
          </form>
        )}
      </div>
    </DesignCard>
  );
}
