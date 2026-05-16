import { describe, expect, test } from "vitest";

import { googlePaymentImportSchema } from "@/lib/domain/schemas";

const validImportRow = {
  userGameId: "10000000-0000-4000-8000-000000000001",
  amount: 33000,
  type: "coin",
  paidAt: "2026-05-10T03:00:00.000Z",
  source: "google_play",
  externalOrderId: "GPA.1234-5678",
  importFingerprint: "google-test-fingerprint",
  merchant: "Google Play",
  rawDescription: "Genshin Impact Genesis Crystal Pack",
  currency: "KRW",
};

describe("googlePaymentImportSchema", () => {
  test("accepts normalized KRW import rows", () => {
    expect(() => googlePaymentImportSchema.parse({ rows: [validImportRow] })).not.toThrow();
  });

  test("rejects unsupported currencies", () => {
    const result = googlePaymentImportSchema.safeParse({
      rows: [{ ...validImportRow, currency: "USD" }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects user game ids that are not UUIDs", () => {
    const result = googlePaymentImportSchema.safeParse({
      rows: [{ ...validImportRow, userGameId: "not-a-user-game-id" }],
    });

    expect(result.success).toBe(false);
  });
});
