import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  Gauge,
  ShieldCheck,
  Target,
  Upload,
  WalletCards,
} from "lucide-react";

import { trackBanner } from "@/app/actions";
import {
  BANNER_TYPE_LABELS,
  formatKrw,
  formatPercent,
  getBudgetPace,
  getBudgetWarningLevel,
  getDaysUntil,
  getMonthlySpend,
  getPityProgress,
  getRemainingPulls,
  getTodaySpent,
  probAt,
} from "@/lib/domain/calculations";
import type { BannerRecord, DashboardData, UserBanner } from "@/lib/domain/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DesignCard,
  EmptyState,
  ProgressBar,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { PaymentForm } from "@/components/dashboard/payment-form";
import { SpendCharts } from "@/components/dashboard/spend-charts";

export function DashboardShell({
  data,
  authState,
}: {
  data: DashboardData;
  authState?: string;
}) {
  const monthlySpend = getMonthlySpend(data.payments);
  const fallbackBudget = data.userGames.reduce(
    (total, userGame) => total + userGame.monthly_budget,
    0,
  );
  const budgetAmount = data.budget?.total_budget ?? fallbackBudget;
  const warning = getBudgetWarningLevel(
    monthlySpend,
    budgetAmount,
    data.budget?.warning_at ?? 70,
  );
  const todaySpent = getTodaySpent(data.payments);
  const pace = getBudgetPace({ spent: monthlySpend, budget: budgetAmount });
  const trackedBannerIds = new Set(data.userBanners.map((item) => item.banner_id));
  const suggestedBanners = data.banners.filter((banner) => !trackedBannerIds.has(banner.id));

  const budgetHazard =
    warning.level === "over" || warning.level === "limit"
      ? "danger"
      : warning.level === "warning"
        ? "caution"
        : undefined;

  return (
    <div className="space-y-6" data-screen-label="Dashboard">
      <section className="flex flex-col gap-3 rounded-md border border-border/80 bg-[#13161f] p-4.5 sm:flex-row sm:items-end sm:justify-between zzz-panel-shadow">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest">
            <span>[ SYSTEM: MONITORING // LIVE ]</span>
          </div>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl uppercase text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            이번 달 예산, pity, 뽑기 기록을 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="font-heading font-bold text-xs uppercase tracking-tight">
            <Link href="/imports/google">
              <Upload className="size-3.5" />
              Google 결제 가져오기
            </Link>
          </Button>
          <ToneBadge tone={data.isDemo ? "warn" : "safe"}>
            <ShieldCheck className="size-3 stroke-[2.5]" />
            {data.isAuthenticated
              ? "Firebase 보호 중"
              : data.authEnabled
                ? "로그인하면 저장 가능"
                : "Demo Mode"}
          </ToneBadge>
          <ToneBadge tone="info">{data.yearMonth}</ToneBadge>
        </div>
      </section>

      {data.isDemo ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>데모 데이터로 미리보기 중</AlertTitle>
          <AlertDescription>
            {data.authEnabled
              ? "로그인하면 결제, 예산, 뽑기 기록을 개인 데이터로 저장할 수 있습니다."
              : "Firebase 환경 변수를 연결하면 저장 기능이 활성화됩니다."}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <DesignCard bodyClassName="p-4.5 space-y-3" hazard={budgetHazard}>
          <StatBlock
            label="이번 달 지출"
            value={formatKrw(monthlySpend)}
            delta={`${formatKrw(budgetAmount)} 예산 중 ${warning.percent}%`}
            tone={warning.level === "over" || warning.level === "limit" ? "danger" : warning.level === "warning" ? "warn" : "safe"}
          />
          <ProgressBar
            value={warning.percent}
            tone={warning.level === "over" || warning.level === "limit" ? "danger" : warning.level === "warning" ? "warn" : "safe"}
            thick
          />
        </DesignCard>
        <DesignCard bodyClassName="p-4.5 space-y-3">
          <StatBlock
            label="남은 예산"
            value={formatKrw(warning.remaining)}
            delta={`경고선 ${formatKrw(warning.thresholdAmount)}`}
            tone={warning.level === "warning" ? "warn" : warning.level === "over" ? "danger" : "safe"}
          />
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <WalletCards className="size-3.5 text-[var(--brand)]" />
            실제 결제 기록 기준
          </div>
        </DesignCard>
        <DesignCard bodyClassName="p-4.5 space-y-3">
          <StatBlock
            label="월말 예상"
            value={formatKrw(pace.projected)}
            delta={`오늘 기준 예상치 ${formatKrw(pace.expectedSpend)}`}
            tone={pace.projected > budgetAmount ? "danger" : "safe"}
          />
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Gauge className="size-3.5 text-[var(--info)]" />
            {pace.day}/{pace.daysInMonth}일 진행
          </div>
        </DesignCard>
        <DesignCard bodyClassName="p-4.5 space-y-3">
          <StatBlock
            label="오늘 기록한 지출"
            value={formatKrw(todaySpent)}
            delta={`${formatKrw(data.profile.session_warning_amount)} 이상이면 확인`}
            tone={todaySpent >= data.profile.session_warning_amount ? "warn" : "default"}
          />
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <CalendarClock className="size-3.5 text-[var(--gold)]" />
            Asia/Seoul 기준
          </div>
        </DesignCard>
      </section>

      <section className="grid gap-4.5 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-4.5">
          <DesignCard
            title="추적 중인 배너"
            sub={`${data.userBanners.length}개 추적 중`}
            right={
              <Button asChild variant="outline" size="xs" className="font-heading font-bold text-xs uppercase tracking-tight">
                <Link href="/banners">
                  전체 보기
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {data.userBanners.slice(0, 4).map((userBanner) => (
                <TrackedBannerCard key={userBanner.id} userBanner={userBanner} />
              ))}
            </div>
            {data.userBanners.length === 0 ? (
              <EmptyState>
                아직 추적 중인 배너가 없습니다. 배너를 추가하면 pity와 확률을 볼 수 있어요.
              </EmptyState>
            ) : null}
          </DesignCard>

          <DesignCard title="지출 대시보드" sub="게임별 비중과 일자별 흐름">
            <SpendCharts payments={data.payments} userGames={data.userGames} />
          </DesignCard>

          <DesignCard title="새로 추적할 수 있는 배너" sub={`${suggestedBanners.length}개`}>
            <div className="grid gap-3 md:grid-cols-2">
              {suggestedBanners.slice(0, 4).map((banner) => (
                <SuggestedBannerCard key={banner.id} banner={banner} isDemo={data.isDemo} />
              ))}
            </div>
            {suggestedBanners.length === 0 ? (
              <EmptyState>모든 활성 배너를 이미 추적 중입니다.</EmptyState>
            ) : null}
          </DesignCard>
        </div>

        <aside className="space-y-4.5">
          <DesignCard title="빠른 지출 기록" sub="예산 계산에 바로 반영됩니다">
            <PaymentForm
              userGames={data.userGames}
              todaySpent={todaySpent}
              sessionWarningAmount={data.profile.session_warning_amount}
              isDemo={data.isDemo}
              authEnabled={data.authEnabled}
              isAuthenticated={data.isAuthenticated}
              authState={authState}
            />
          </DesignCard>

          <DesignCard title="가드레일 상태" sub="숫자는 알려주고, 판단은 사용자가 합니다">
            <div className="space-y-2.5">
              {data.guardrailRules.slice(0, 4).map((rule) => (
                <div key={rule.id} className="flex items-start gap-3 rounded-sm border border-border/80 bg-muted/20 p-3 zzz-panel-shadow">
                  <Target className="mt-0.5 size-4 text-[var(--brand)] stroke-[2.5]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-sm font-bold uppercase tracking-tight text-foreground">{rule.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {rule.threshold_percent
                        ? `${rule.threshold_percent}% 기준`
                        : rule.threshold_amount
                          ? `${formatKrw(rule.threshold_amount)} 기준`
                          : rule.cooldown_days
                            ? `${rule.cooldown_days}일 쉬기`
                            : "조건 없음"}
                    </div>
                  </div>
                  <ToneBadge tone={rule.enabled ? "safe" : "default"}>
                    {rule.enabled ? "ON" : "OFF"}
                  </ToneBadge>
                </div>
              ))}
              {data.guardrailRules.length === 0 ? (
                <EmptyState>아직 설정한 가드레일이 없습니다.</EmptyState>
              ) : null}
            </div>
          </DesignCard>

          <DesignCard title="최근 뽑기" sub={`${data.pulls.length}개 기록`}>
            <div className="space-y-0">
              {data.pulls.slice(0, 6).map((pull) => (
                <div
                  key={pull.id}
                  className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-b-0 hover:bg-muted/30 px-1 rounded-xs transition-colors"
                >
                  <ToneBadge tone={pull.rarity >= 5 ? "gold" : pull.rarity >= 4 ? "info" : "default"}>
                    {pull.rarity}성
                  </ToneBadge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm text-foreground">
                      {pull.item_name ?? "결과 미입력"}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {pull.user_banners?.banners?.name ?? "배너"} · pity {pull.pity_before}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                    {formatKrw(pull.cost)}
                  </span>
                </div>
              ))}
              {data.pulls.length === 0 ? (
                <EmptyState>
                  아직 뽑기 결과가 없습니다. Pull Log에서 첫 세션을 기록해 보세요.
                </EmptyState>
              ) : null}
            </div>
          </DesignCard>
        </aside>
      </section>
    </div>
  );
}

function TrackedBannerCard({ userBanner }: { userBanner: UserBanner }) {
  const banner = userBanner.banners;
  const remaining = getRemainingPulls(userBanner.current_pity, banner.hard_pity);
  const progress = getPityProgress(userBanner.current_pity, banner.hard_pity);
  const nextChance = probAt(userBanner.current_pity + 1, {
    baseRate: banner.base_rate,
    softPity: banner.soft_pity,
    hardPity: banner.hard_pity,
  });

  return (
    <Link
      href={`/banners/${banner.id}`}
      className="group block rounded-sm border border-border/80 bg-muted/20 p-3.5 transition-all hover:border-[var(--brand)]/80 hover:bg-muted/40 zzz-panel-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 max-w-full truncate font-heading text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-[var(--brand)]">
              {banner.name}
            </h3>
            {!banner.is_public ? <ToneBadge tone="info">내 배너</ToneBadge> : null}
            <ToneBadge tone={remaining <= 10 ? "danger" : "safe"}>
              {remaining}회 남음
            </ToneBadge>
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {banner.games.name} · {banner.featured}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs font-bold text-[var(--gold)] tabular-nums">
          {formatPercent(nextChance)}
        </span>
      </div>
      <div className="mt-3.5 space-y-1.5">
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>pity {userBanner.current_pity}/{banner.hard_pity}</span>
          <span>{userBanner.pulls_total} pulls</span>
        </div>
        <ProgressBar value={progress} tone={remaining <= 10 ? "danger" : "safe"} />
      </div>
    </Link>
  );
}

function SuggestedBannerCard({
  banner,
  isDemo,
}: {
  banner: BannerRecord;
  isDemo: boolean;
}) {
  const daysLeft = getDaysUntil(banner.ends_at);

  return (
    <div className="rounded-sm border border-border/80 bg-muted/20 p-3.5 zzz-panel-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-heading text-sm font-bold uppercase tracking-tight text-foreground">
              {banner.name}
            </h3>
            <ToneBadge>{BANNER_TYPE_LABELS[banner.banner_type]}</ToneBadge>
            {!banner.is_public ? <ToneBadge tone="info">내 배너</ToneBadge> : null}
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {banner.games.name} · {banner.featured}
          </p>
        </div>
        <ToneBadge tone={daysLeft <= 7 ? "warn" : "info"}>
          {daysLeft > 0 ? `${daysLeft}일` : "종료"}
        </ToneBadge>
      </div>
      <form action={trackBanner} className="mt-3.5">
        <input type="hidden" name="bannerId" value={banner.id} />
        <Button type="submit" variant="outline" size="sm" disabled={isDemo} className="w-full font-heading font-bold uppercase tracking-tight">
          추적 시작
        </Button>
      </form>
    </div>
  );
}
