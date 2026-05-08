import type { PaymentType } from "@/types/database";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  gacha: "뽑기",
  pass: "패스",
  coin: "코인충전",
  event: "이벤트",
  other: "기타",
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
