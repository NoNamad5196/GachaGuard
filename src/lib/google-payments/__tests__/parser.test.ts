import JSZip from "jszip";
import { describe, expect, test } from "vitest";

import type { UserGame } from "@/lib/domain/dashboard";
import { parseGooglePaymentFile } from "@/lib/google-payments/parser";

const userGames: UserGame[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: "demo-user",
    game_id: "00000000-0000-4000-8000-000000000001",
    nickname: null,
    current_pity: 0,
    monthly_budget: 0,
    warning_threshold_percent: 70,
    is_active: true,
    games: {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "genshin-impact",
      name: "원신",
      developer: "HoYoverse",
      genre: "RPG",
      soft_pity: 75,
      hard_pity: 90,
      base_cost: 3300,
      has_guarantee: true,
    },
  },
];

describe("parseGooglePaymentFile", () => {
  test("normalizes Google Play purchase JSON", async () => {
    const file = jsonFile("play.json", {
      purchases: [
        {
          purchaseTime: "2026-05-10T12:00:00+09:00",
          invoicePrice: "₩33,000",
          purchaseState: "Purchased",
          purchaseDetail: "Genesis Crystal Pack",
          doc: { title: "Genshin Impact" },
        },
      ],
    });

    const [candidate] = await parseGooglePaymentFile(file, { userGames });

    expect(candidate).toMatchObject({
      source: "google_play",
      amount: 33000,
      currency: "KRW",
      suggestedUserGameId: userGames[0].id,
      status: "ready",
      type: "coin",
    });
  });

  test("normalizes Google Play Takeout Purchase History JSON", async () => {
    const file = jsonFile("Purchase History.json", [
      {
        purchaseHistory: {
          invoicePrice: "₩33,000",
          paymentMethodTitle: "Visa **** 4242",
          userLanguageCode: "ko",
          userCountry: "KR",
          doc: {
            documentType: "ANDROID_APP",
            title: "Genshin Impact Genesis Crystal Pack",
          },
          purchaseTime: "2026-05-10T03:00:00.000Z",
        },
      },
      {
        purchaseHistory: {
          invoicePrice: "$9.99",
          paymentMethodTitle: "Visa **** 4242",
          userLanguageCode: "en",
          userCountry: "US",
          doc: {
            title: "Genshin Impact Starter Bundle",
          },
          purchaseTime: "2026-05-11T03:00:00.000Z",
        },
      },
    ]);

    const candidates = await parseGooglePaymentFile(file, { userGames });

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      source: "google_play",
      amount: 33000,
      currency: "KRW",
      merchant: "Google Play",
      rawDescription: expect.stringContaining("결제 수단: Visa **** 4242"),
      suggestedUserGameId: userGames[0].id,
      status: "ready",
      type: "coin",
    });
    expect(candidates[0].externalOrderId).toBeNull();
    expect(candidates[0].importFingerprint).toMatch(/^google-[a-f0-9]{8}$/);
    expect(candidates[1]).toMatchObject({
      currency: "USD",
      status: "unsupported",
      statusReason: "KRW 결제만 자동 저장할 수 있습니다.",
    });
  });

  test("parses Google Pay CSV and marks existing fingerprints as duplicate", async () => {
    const csv = [
      "Date,Amount,Currency,Description,Merchant,Transaction ID",
      "2026-05-11T10:00:00+09:00,11000,KRW,Genshin Impact Monthly Pass,Google Play,GPA.123",
    ].join("\n");
    const firstPass = await parseGooglePaymentFile(textFile("pay.csv", csv), { userGames });
    const secondPass = await parseGooglePaymentFile(textFile("pay.csv", csv), {
      userGames,
      existingImportFingerprints: [firstPass[0].importFingerprint],
    });

    expect(firstPass[0]).toMatchObject({ amount: 11000, type: "pass", status: "ready" });
    expect(secondPass[0]).toMatchObject({ status: "duplicate" });
  });

  test("reads supported files inside a Takeout ZIP", async () => {
    const zip = new JSZip();
    zip.file(
      "Takeout/Google Play/Purchases.json",
      JSON.stringify([
        {
          purchaseTime: "2026-05-12T09:30:00+09:00",
          invoicePrice: "₩5,900",
          purchaseState: "Purchased",
          purchaseDetail: "Genshin Impact Bundle",
          doc: { title: "Genshin Impact" },
        },
      ]),
    );
    const file = new File([await zip.generateAsync({ type: "blob" })], "takeout.zip", {
      type: "application/zip",
    });

    const [candidate] = await parseGooglePaymentFile(file, { userGames });

    expect(candidate).toMatchObject({
      amount: 5900,
      source: "google_play",
      suggestedGameName: "원신",
    });
  });

  test("marks unsupported currencies and unmatched games for review", async () => {
    const file = jsonFile("play.json", [
      {
        purchaseTime: "2026-05-13T12:00:00+09:00",
        invoicePrice: "$9.99",
        purchaseState: "Purchased",
        purchaseDetail: "Unknown Game Gems",
        doc: { title: "Unknown Game" },
      },
      {
        purchaseTime: "2026-05-14T12:00:00+09:00",
        invoicePrice: "₩1,100",
        purchaseState: "Purchased",
        purchaseDetail: "Unknown Game Gems",
        doc: { title: "Unknown Game" },
      },
    ]);

    const candidates = await parseGooglePaymentFile(file, { userGames });

    expect(candidates[0]).toMatchObject({ currency: "USD", status: "unsupported" });
    expect(candidates[1]).toMatchObject({ currency: "KRW", status: "needs_review" });
  });
});

function jsonFile(name: string, value: unknown) {
  return textFile(name, JSON.stringify(value), "application/json");
}

function textFile(name: string, value: string, type = "text/csv") {
  return new File([value], name, { type });
}
