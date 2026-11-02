import { describe, expect, test } from "vitest";

import { googlePaymentImportSchema } from "@/lib/domain/schemas";

const validImportRow = {
  userGameId: "genshin-impact",
  amount: 33000,
  type: "coin" as const,
  paidAt: "2026-05-10T03:00:00.000Z",
  source: "google_play" as const,
  externalOrderId: "GPA.1234-5678",
  importFingerprint: "google-test-fingerprint",
  merchant: "Google Play",
  rawDescription: "Genshin Impact Genesis Crystal Pack",
  currency: "KRW" as const,
};

describe("googlePaymentImportSchema", () => {
  test("accepts normalized KRW import rows with safe Firestore IDs", () => {
    expect(() => googlePaymentImportSchema.parse({ rows: [validImportRow] })).not.toThrow();
  });

  test("rejects unsupported currencies", () => {
    const result = googlePaymentImportSchema.safeParse({
      rows: [{ ...validImportRow, currency: "USD" }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects invalid firestore document IDs", () => {
    const result = googlePaymentImportSchema.safeParse({
      rows: [{ ...validImportRow, userGameId: "invalid/slash/id" }],
    });

    expect(result.success).toBe(false);
  });
});
