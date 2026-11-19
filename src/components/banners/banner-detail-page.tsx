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

      <section className="flex flex-col gap-3 rounded-md border border-border/80 bg-[#13161f] p-4.5 sm:flex-row sm:items-end sm:justify-between zzz-panel-shadow">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <ToneBadge>{BANNER_TYPE_LABELS[banner.banner_type]}</ToneBadge>
            {!banner.is_public ? <ToneBadge tone="gold">내 배너</ToneBadge> : null}
            <ToneBadge tone={daysLeft <= 7 ? "warn" : "info"}>
              <CalendarClock className="size-3" />
              {daysLeft > 0 ? `${daysLeft}일 남음` : "종료됨"}
            </ToneBadge>
            <ToneBadge tone={userBanner ? "safe" : "default"}>
              {userBanner ? "추적 중" : "미추적"}
            </ToneBadge>
          </div>
          <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            {banner.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
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
              <Button
                type="submit"
                disabled={data.isDemo}
                className="bg-[var(--brand)] font-heading font-bold uppercase tracking-tight text-[#0b0d11] shadow-[0_0_12px_rgba(212,255,42,0.25)] hover:bg-[var(--brand)]/90"
              >
                추적 시작
              </Button>
            </form>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <DesignCard>
          <div className="rounded-sm border-2 border-border/80 bg-[var(--surface-2)] p-4.5 zzz-panel-shadow">
            <div className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[var(--gold)]">
              {"// 5★ RATE_UP TARGET"}
            </div>
            <h2 className="mt-1.5 font-heading text-2xl font-black uppercase tracking-tight text-foreground">{banner.featured}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              기본 확률 {formatPercent(banner.base_rate)} · 5성 획득 시 픽업 확률{" "}
              {formatPercent(banner.rate_up, 0)}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatBlock label="현재 pity" value={`${pity}/${banner.hard_pity}`} />
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
                  <div className="text-xs text-muted-foreground">pity {pull.pity_before}</div>
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

        <DesignCard title="지출 영향" sub="결제 기록과 뽑기 비용은 분리합니다">
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
              Pull Log 비용은 세션 단위 참고값입니다. 실제 예산 초과 판단은 결제 기록 금액을 기준으로 합니다.
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
  const denominator = Math.max(banner.hard_pity - 1, 1);
  const points = Array.from({ length: banner.hard_pity }, (_, index) => index + 1);
  const path = points
    .map((pity, index) => {
      const x = padding + ((pity - 1) / denominator) * (width - padding * 2);
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
    padding + (Math.min(currentPity, banner.hard_pity - 1) / denominator) * (width - padding * 2);

  return (
    <div className="overflow-hidden rounded-sm border-2 border-border bg-card/60 p-3 zzz-panel-shadow">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="배너 확률 곡선">
        <g stroke="#282e3f" strokeWidth="1">
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
            x1={padding + ((banner.soft_pity - 1) / denominator) * (width - padding * 2)}
            x2={padding + ((banner.soft_pity - 1) / denominator) * (width - padding * 2)}
            y1={padding}
            y2={height - padding}
            stroke="#ff6b00"
            strokeDasharray="4 4"
            strokeWidth="2"
          />
        ) : null}
        <path d={path} fill="none" stroke="#d9ff00" strokeWidth="3" strokeLinecap="round" />
        <line x1={cursorX} x2={cursorX} y1={padding} y2={height - padding} stroke="#00e5ff" strokeWidth="2" />
        <circle
          cx={cursorX}
          cy={
            height -
            padding -
            probAt(currentPity, {
              baseRate: banner.base_rate,
              softPity: banner.soft_pity,
              hardPity: banner.hard_pity,
            }) *
              (height - padding * 2)
          }
          r="6"
          fill="#d9ff00"
          stroke="#0b0c10"
          strokeWidth="2.5"
        />
      </svg>
      <div className="flex flex-wrap gap-4 font-mono text-xs text-muted-foreground mt-2">
        <span>soft pity {banner.soft_pity ?? "-"}</span>
        <span>hard pity {banner.hard_pity}</span>
        <span className="text-[var(--brand)] font-bold">현재 {currentPity}</span>
      </div>
    </div>
  );
}
