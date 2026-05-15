import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { trackBanner } from "@/app/actions";
import {
  BANNER_TYPE_LABELS,
  cumulativeBy,
  formatKrw,
  formatPercent,
  getDaysUntil,
  getEstimatedCostToPity,
  getPityProgress,
  getRemainingPulls,
  probAt,
} from "@/lib/domain/calculations";
import type { BannerRecord, DashboardData } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import {
  DesignCard,
  EmptyState,
  ProgressBar,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { AddPullSheet } from "@/components/pulls/add-pull-sheet";

export function BannerDetailPage({
  data,
  banner,
}: {
  data: DashboardData;
  banner: BannerRecord;
}) {
  const userBanner = data.userBanners.find((item) => item.banner_id === banner.id);
  const bannerPulls = data.pulls.filter((pull) => pull.user_banner_id === userBanner?.id);
  const pity = userBanner?.current_pity ?? 0;
  const remaining = getRemainingPulls(pity, banner.hard_pity);
  const progress = getPityProgress(pity, banner.hard_pity);
  const nextChance = probAt(pity + 1, {
    baseRate: banner.base_rate,
    softPity: banner.soft_pity,
    hardPity: banner.hard_pity,
  });
  const cumulative = cumulativeBy(pity, {
    baseRate: banner.base_rate,
    softPity: banner.soft_pity,
    hardPity: banner.hard_pity,
  });
  const estimatedCost = getEstimatedCostToPity(pity, banner.hard_pity, banner.games.base_cost);
  const daysLeft = getDaysUntil(banner.ends_at);

  return (
    <div className="space-y-5" data-screen-label={`Banner · ${banner.name}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm">
          <Link href="/banners">
            <ArrowLeft className="size-4" />
            Banners
          </Link>
        </Button>
      </div>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <ToneBadge>{BANNER_TYPE_LABELS[banner.banner_type]}</ToneBadge>
            <ToneBadge tone={daysLeft <= 7 ? "warn" : "info"}>
              <CalendarClock className="size-3" />
              {daysLeft}일 남음
            </ToneBadge>
            <ToneBadge tone={userBanner ? "safe" : "default"}>
              {userBanner ? "추적 중" : "미추적"}
            </ToneBadge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{banner.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {banner.games.name} · 픽업 {banner.featured}
          </p>
        </div>
        <div className="flex gap-2">
          {userBanner ? (
            <AddPullSheet
              userBanners={data.userBanners}
              isDemo={data.isDemo}
              defaultUserBannerId={userBanner.id}
            />
          ) : (
            <form action={trackBanner}>
              <input type="hidden" name="bannerId" value={banner.id} />
              <Button type="submit" disabled={data.isDemo}>
                추적 시작
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <DesignCard>
          <div className="rounded-lg border bg-[var(--surface-2)] p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              5성 Rate-up
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{banner.featured}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              기본 확률 {formatPercent(banner.base_rate)} · 5성 획득 시 픽업 확률{" "}
              {formatPercent(banner.rate_up, 0)}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatBlock label="현재 피티" value={`${pity}/${banner.hard_pity}`} />
            <StatBlock label="남은 횟수" value={`${remaining}회`} tone={remaining <= 10 ? "danger" : "safe"} />
            <StatBlock label="다음 5성 확률" value={formatPercent(nextChance)} tone="gold" />
            <StatBlock label="천장 예상 비용" value={formatKrw(estimatedCost)} />
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} tone={remaining <= 10 ? "danger" : "safe"} thick />
          </div>
        </DesignCard>

        <DesignCard
          title="확률 곡선"
          sub={`천장까지 누적 5성 확률 ${formatPercent(cumulative)}`}
        >
          <ProbabilityCurve banner={banner} currentPity={pity} />
        </DesignCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DesignCard title="최근 결과" sub={`${bannerPulls.length}개`}>
          <div className="space-y-0">
            {bannerPulls.slice(0, 8).map((pull) => (
              <div
                key={pull.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <ToneBadge tone={pull.rarity >= 5 ? "gold" : pull.rarity >= 4 ? "info" : "default"}>
                  {pull.rarity}성
                </ToneBadge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {pull.item_name ?? "결과 미입력"}
                  </div>
                  <div className="text-xs text-muted-foreground">피티 {pull.pity_before}</div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatKrw(pull.cost)}
                </span>
              </div>
            ))}
            {bannerPulls.length === 0 ? (
              <EmptyState>이 배너의 뽑기 기록이 아직 없습니다.</EmptyState>
            ) : null}
          </div>
        </DesignCard>

        <DesignCard title="지출 영향" sub="결제 기록과 뽑기 비용은 분리됩니다">
          <div className="grid gap-4">
            <StatBlock
              label="이 배너 기록 비용"
              value={formatKrw(bannerPulls.reduce((total, pull) => total + pull.cost, 0))}
            />
            <StatBlock
              label="천장까지 추가 예상"
              value={formatKrw(estimatedCost)}
              tone={remaining <= 10 ? "warn" : "default"}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Pull Log의 비용은 세션 단위 참고값입니다. 실제 예산 초과 판단은 지출 기록의 결제 금액을 기준으로 합니다.
            </p>
          </div>
        </DesignCard>
      </section>
    </div>
  );
}

function ProbabilityCurve({
  banner,
  currentPity,
}: {
  banner: BannerRecord;
  currentPity: number;
}) {
  const width = 720;
  const height = 260;
  const padding = 28;
  const points = Array.from({ length: banner.hard_pity }, (_, index) => index + 1);
  const path = points
    .map((pity, index) => {
      const x = padding + ((pity - 1) / (banner.hard_pity - 1)) * (width - padding * 2);
      const chance = probAt(pity, {
        baseRate: banner.base_rate,
        softPity: banner.soft_pity,
        hardPity: banner.hard_pity,
      });
      const y = height - padding - chance * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const cursorX =
    padding + (Math.min(currentPity, banner.hard_pity - 1) / (banner.hard_pity - 1)) * (width - padding * 2);

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/20 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img">
        <g stroke="#E7E5E0" strokeWidth="1">
          {[0.25, 0.5, 0.75, 1].map((line) => (
            <line
              key={line}
              x1={padding}
              x2={width - padding}
              y1={height - padding - line * (height - padding * 2)}
              y2={height - padding - line * (height - padding * 2)}
            />
          ))}
        </g>
        {banner.soft_pity ? (
          <line
            x1={padding + ((banner.soft_pity - 1) / (banner.hard_pity - 1)) * (width - padding * 2)}
            x2={padding + ((banner.soft_pity - 1) / (banner.hard_pity - 1)) * (width - padding * 2)}
            y1={padding}
            y2={height - padding}
            stroke="#B5751E"
            strokeDasharray="4 4"
          />
        ) : null}
        <path d={path} fill="none" stroke="#1B8A6B" strokeWidth="3" strokeLinecap="round" />
        <line x1={cursorX} x2={cursorX} y1={padding} y2={height - padding} stroke="#0F1115" strokeWidth="1.5" />
        <circle cx={cursorX} cy={height - padding - probAt(currentPity, {
          baseRate: banner.base_rate,
          softPity: banner.soft_pity,
          hardPity: banner.hard_pity,
        }) * (height - padding * 2)} r="5" fill="#1B8A6B" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>soft pity {banner.soft_pity ?? "-"}</span>
        <span>hard pity {banner.hard_pity}</span>
        <span>현재 {currentPity}</span>
      </div>
    </div>
  );
}
