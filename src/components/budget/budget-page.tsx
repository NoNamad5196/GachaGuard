import { upsertGuardrailRule, toggleGuardrailRule } from "@/app/actions";
import {
  formatKrw,
  getBudgetPace,
  getBudgetWarningLevel,
  getMonthlySpend,
  GUARDRAIL_RULE_LABELS,
} from "@/lib/domain/calculations";
import type { DashboardData, GuardrailRule } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DesignCard,
  EmptyState,
  ProgressBar,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { BudgetForm } from "@/components/dashboard/quick-forms";

export function BudgetPage({ data }: { data: DashboardData }) {
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
  const pace = getBudgetPace({ spent: monthlySpend, budget: budgetAmount });

  return (
    <div className="space-y-5" data-screen-label="Budget">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Budget & Guardrails
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            월 예산과 멈춤 규칙을 숫자로 관리합니다. 판단을 대신하지 않고, 신호만 분명하게 보여줍니다.
          </p>
        </div>
        <ToneBadge tone={warning.level === "over" ? "danger" : "safe"}>
          {warning.percent}% 사용
        </ToneBadge>
      </section>

      <DesignCard>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  월 예산 · {data.yearMonth}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-medium tabular-nums">
                    {formatKrw(monthlySpend)}
                  </span>
                  <span className="font-mono text-muted-foreground">/ {formatKrw(budgetAmount)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  월말 예상
                </div>
                <div className="mt-2 font-mono text-2xl font-medium text-[var(--danger)]">
                  {formatKrw(pace.projected)}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar
                value={warning.percent}
                tone={warning.level === "over" || warning.level === "limit" ? "danger" : "safe"}
                thick
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>오늘까지 예상 페이스 {formatKrw(pace.expectedSpend)}</span>
              <span>남은 예산 {formatKrw(warning.remaining)}</span>
            </div>
          </div>

          <div className="grid gap-3 border-border lg:border-l lg:pl-6">
            <StatBlock label="하루 평균" value={formatKrw(Math.round(monthlySpend / pace.day))} />
            <StatBlock
              label="페이스 차이"
              value={formatKrw(Math.abs(pace.deltaFromPace))}
              delta={pace.deltaFromPace >= 0 ? "예상보다 빠름" : "예상보다 느림"}
              tone={pace.deltaFromPace >= 0 ? "warn" : "safe"}
            />
          </div>
        </div>
      </DesignCard>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <DesignCard title="예산 설정" sub="결제 기록 계산 기준">
          <BudgetForm data={data} />
        </DesignCard>

        <DesignCard title="가드레일 규칙" sub={`${data.guardrailRules.length}개`}>
          <div className="space-y-3">
            {data.guardrailRules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} isDemo={data.isDemo} />
            ))}
            {data.guardrailRules.length === 0 ? (
              <EmptyState>가드레일 규칙을 아직 만들지 않았습니다.</EmptyState>
            ) : null}
          </div>
        </DesignCard>
      </section>

      <DesignCard title="새 가드레일 추가" sub="경고, 하드 스톱, 쿨다운을 직접 설정">
        <form action={upsertGuardrailRule} className="grid gap-3 lg:grid-cols-[180px_1fr_160px_160px_140px_auto]">
          <select
            name="kind"
            defaultValue="warning"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            disabled={data.isDemo}
          >
            <option value="warning">예산 경고</option>
            <option value="hard_stop">하드 스톱</option>
            <option value="daily_cap">일일 상한</option>
            <option value="cooldown">쿨다운</option>
          </select>
          <Input name="name" placeholder="규칙 이름" disabled={data.isDemo} required />
          <Input name="thresholdAmount" type="number" min={0} placeholder="금액" disabled={data.isDemo} />
          <Input name="thresholdPercent" type="number" min={1} max={200} placeholder="퍼센트" disabled={data.isDemo} />
          <Input name="cooldownDays" type="number" min={1} max={30} placeholder="쉬는 날" disabled={data.isDemo} />
          <input type="hidden" name="enabled" value="true" />
          <Button type="submit" disabled={data.isDemo}>
            추가
          </Button>
        </form>
      </DesignCard>
    </div>
  );
}

function RuleRow({ rule, isDemo }: { rule: GuardrailRule; isDemo: boolean }) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/25 p-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{rule.name}</h3>
          <ToneBadge tone={rule.enabled ? "safe" : "default"}>
            {rule.enabled ? "ON" : "OFF"}
          </ToneBadge>
          <ToneBadge>{GUARDRAIL_RULE_LABELS[rule.kind]}</ToneBadge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {rule.threshold_percent ? `${rule.threshold_percent}% 기준` : null}
          {rule.threshold_amount ? ` · ${formatKrw(rule.threshold_amount)} 기준` : null}
          {rule.cooldown_days ? ` · ${rule.cooldown_days}일 쉬기` : null}
        </div>
      </div>
      <form action={toggleGuardrailRule}>
        <input type="hidden" name="id" value={rule.id} />
        <input type="hidden" name="enabled" value={rule.enabled ? "false" : "true"} />
        <Button type="submit" variant="outline" size="sm" disabled={isDemo}>
          {rule.enabled ? "끄기" : "켜기"}
        </Button>
      </form>
    </div>
  );
}
