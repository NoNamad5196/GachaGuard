import type { BannerType, GuardrailRuleKind, PaymentType } from "@/types/database";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  gacha: "뽑기",
  pass: "패스",
  coin: "코인충전",
  event: "이벤트",
  other: "기타",
};

export const BANNER_TYPE_LABELS: Record<BannerType, string> = {
  character: "캐릭터",
  weapon: "무기",
  standard: "상시",
  event: "이벤트",
};

export const GUARDRAIL_RULE_LABELS: Record<GuardrailRuleKind, string> = {
  warning: "예산 경고",
  hard_stop: "하드 스톱",
  cooldown: "쿨다운",
  daily_cap: "일일 상한",
};

export type BudgetWarningLevel = "unset" | "safe" | "warning" | "limit" | "over";

export interface SpendRecord {
  amount: number;
  paid_at?: string;
}

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function getMonthRange(date = new Date()) {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const monthIndex = kstDate.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1) - KST_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthIndex + 1, 1) - KST_OFFSET_MS);

  return {
    year,
    month: monthIndex + 1,
    yearMonth: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getMonthlySpend(
  payments: SpendRecord[],
  range = getMonthRange(),
) {
  return payments.reduce((total, payment) => {
    if (!payment.paid_at) {
      return total + payment.amount;
    }

    const paidAt = new Date(payment.paid_at);
    if (paidAt >= range.start && paidAt < range.end) {
      return total + payment.amount;
    }

    return total;
  }, 0);
}

export function getBudgetWarningLevel(
  spent: number,
  budget: number,
  warningAt = 70,
) {
  if (budget <= 0) {
    return {
      level: "unset" as BudgetWarningLevel,
      percent: 0,
      remaining: 0,
      thresholdAmount: 0,
    };
  }

  const percent = Math.round((spent / budget) * 100);
  const thresholdAmount = Math.round((budget * warningAt) / 100);
  const level: BudgetWarningLevel =
    spent > budget
      ? "over"
      : spent >= budget
        ? "limit"
        : spent >= thresholdAmount
          ? "warning"
          : "safe";

  return {
    level,
    percent,
    remaining: Math.max(budget - spent, 0),
    thresholdAmount,
  };
}

export function getSessionWarning({
  amount,
  todaySpent,
  sessionWarningAmount,
}: {
  amount: number;
  todaySpent: number;
  sessionWarningAmount: number;
}) {
  if (sessionWarningAmount <= 0) {
    return {
      shouldWarn: false,
      totalAfter: todaySpent + amount,
      reason: "disabled" as const,
    };
  }

  const totalAfter = todaySpent + amount;
  const reason =
    amount >= sessionWarningAmount
      ? "single-payment"
      : totalAfter >= sessionWarningAmount
        ? "daily-total"
        : "none";

  return {
    shouldWarn: reason !== "none",
    totalAfter,
    reason,
  };
}

export function getRemainingPulls(currentPity: number, hardPity?: number | null) {
  if (!hardPity || hardPity <= 0) {
    return 0;
  }

  return Math.max(hardPity - currentPity, 0);
}

export function getEstimatedCostToPity(
  currentPity: number,
  hardPity: number | null | undefined,
  baseCost: number,
) {
  return getRemainingPulls(currentPity, hardPity) * Math.max(baseCost, 0);
}

export function getPityProgress(
  currentPity: number,
  hardPity: number | null | undefined,
) {
  if (!hardPity || hardPity <= 0) {
    return 0;
  }

  return Math.min(Math.round((currentPity / hardPity) * 100), 100);
}

export function getDaysUntil(dateIso: string, now = new Date()) {
  const ms = new Date(dateIso).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function probAt(
  pity: number,
  opts: {
    baseRate: number;
    softPity: number | null | undefined;
    hardPity: number;
    ramp?: number;
  },
) {
  const { baseRate, hardPity, ramp = 0.06 } = opts;
  const softPity = opts.softPity ?? hardPity;

  if (pity >= hardPity) {
    return 1;
  }

  if (pity < softPity) {
    return baseRate;
  }

  return Math.min(1, baseRate + (pity - softPity + 1) * ramp);
}

export function cumulativeBy(
  currentPity: number,
  opts: {
    baseRate: number;
    softPity: number | null | undefined;
    hardPity: number;
    ramp?: number;
  },
) {
  let survival = 1;

  for (let pity = currentPity + 1; pity <= opts.hardPity; pity += 1) {
    survival *= 1 - probAt(pity, opts);
  }

  return 1 - survival;
}

export function getBudgetPace({
  spent,
  budget,
  date = new Date(),
}: {
  spent: number;
  budget: number;
  date?: Date;
}) {
  const range = getMonthRange(date);
  const day = new Date(date.getTime() + KST_OFFSET_MS).getUTCDate();
  const daysInMonth = new Date(Date.UTC(range.year, range.month, 0)).getUTCDate();
  const expectedSpend = Math.round((budget * day) / daysInMonth);
  const projected = day > 0 ? Math.round((spent / day) * daysInMonth) : spent;

  return {
    day,
    daysInMonth,
    expectedSpend,
    projected,
    deltaFromPace: spent - expectedSpend,
  };
}

export function getTodaySpent(payments: SpendRecord[], date = new Date()) {
  const targetDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(date);

  return payments.reduce((total, payment) => {
    if (!payment.paid_at) {
      return total;
    }

    const paidDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
    }).format(new Date(payment.paid_at));

    return paidDay === targetDay ? total + payment.amount : total;
  }, 0);
}
