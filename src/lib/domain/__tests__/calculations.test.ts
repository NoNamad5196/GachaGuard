import { describe, expect, it } from "vitest";

import {
  getBudgetWarningLevel,
  getEstimatedCostToPity,
  getMonthRange,
  getMonthlySpend,
  getRemainingPulls,
  getSessionWarning,
} from "@/lib/domain/calculations";

describe("GachaGuard calculations", () => {
  it("maps spending to budget warning levels", () => {
    expect(getBudgetWarningLevel(69000, 100000, 70).level).toBe("safe");
    expect(getBudgetWarningLevel(70000, 100000, 70).level).toBe("warning");
    expect(getBudgetWarningLevel(100000, 100000, 70).level).toBe("limit");
    expect(getBudgetWarningLevel(100001, 100000, 70).level).toBe("over");
  });

  it("uses Asia/Seoul month boundaries", () => {
    const range = getMonthRange(new Date("2026-05-31T16:00:00.000Z"));

    expect(range.yearMonth).toBe("2026-06");
    expect(range.startIso).toBe("2026-05-31T15:00:00.000Z");
    expect(range.endIso).toBe("2026-06-30T15:00:00.000Z");
  });

  it("sums payments inside the selected month only", () => {
    const range = getMonthRange(new Date("2026-05-08T04:00:00.000Z"));
    const spend = getMonthlySpend(
      [
        { amount: 33000, paid_at: "2026-05-01T00:00:00.000Z" },
        { amount: 11000, paid_at: "2026-04-30T14:59:59.000Z" },
        { amount: 59000, paid_at: "2026-05-31T14:59:59.000Z" },
        { amount: 777, paid_at: "2026-05-31T15:00:00.000Z" },
      ],
      range,
    );

    expect(spend).toBe(92000);
  });

  it("warns for large single-session or daily-total payments", () => {
    expect(
      getSessionWarning({
        amount: 50000,
        todaySpent: 0,
        sessionWarningAmount: 50000,
      }).reason,
    ).toBe("single-payment");

    expect(
      getSessionWarning({
        amount: 11000,
        todaySpent: 42000,
        sessionWarningAmount: 50000,
      }).reason,
    ).toBe("daily-total");
  });

  it("calculates pity distance and expected KRW cost", () => {
    expect(getRemainingPulls(67, 80)).toBe(13);
    expect(getRemainingPulls(90, 80)).toBe(0);
    expect(getEstimatedCostToPity(67, 80, 1200)).toBe(15600);
  });
});
