import { createHash } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { getBudgetWarningLevel, getMonthRange, getMonthlySpend } from "@/lib/domain/calculations";

const viewer = vi.hoisted(() => ({ uid: "data-alice" }));
vi.mock("@/lib/firebase/session", () => ({
  getSessionUser: async () => ({ uid: viewer.uid, email: "local@example.test" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

import { getAdminDb } from "@/lib/firebase/admin";
import { addUserGame, upsertBudget, createPayment, importGooglePayments, trackBanner, createPullSession, updatePullResult, deletePull, applyMonthlyTemplates, createPaymentTemplate } from "@/app/actions";

function form(values: Record<string, string | number>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, String(value));
  return result;
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Both emulators are required; real services are prohibited.");
  }
  process.env.FIREBASE_PROJECT_ID = "demo-otakus";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-otakus";
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "emulator-only";
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "demo-otakus.firebaseapp.com";
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "emulator-only";
});

beforeEach(async () => {
  viewer.uid = `data-${crypto.randomUUID()}`;
  const db = getAdminDb();
  await db.doc("games/genshin-impact").set({ name: "원신", aliases: [], franchise_id: null, color: "#123456" });
  await db.doc("modules/gacha/gameConfigs/genshin-impact").set({
    game_id: "genshin-impact", developer: "HoYoverse", genre: "RPG", soft_pity: 75,
    hard_pity: 90, base_cost: 3300, has_guarantee: true,
    schema_version: 1, created_at: Timestamp.now(), updated_at: Timestamp.now(),
  });
  await addUserGame(form({ gameId: "genshin-impact", monthlyBudget: 100000, currentPity: 7 }));
});

describe("Firestore server actions", () => {
  it("rejects foreign user-game references without writing payments", async () => {
    const db = getAdminDb();
    await db.doc("users/someone-else/gacha/main/gameStates/foreign-entry").set({ game_id: "genshin-impact" });
    await expect(createPayment(form({ userGameId: "foreign-entry", amount: 1000, type: "gacha" }))).rejects.toThrow();
    expect((await db.collection(`users/${viewer.uid}/gacha/main/payments`).get()).size).toBe(0);
  });

  it("deduplicates concurrent imports with the contract fingerprint hash", async () => {
    const payload = { rows: [{ userGameId: "genshin-impact", amount: 8000, type: "gacha", paidAt: new Date().toISOString(),
      source: "google_play", importFingerprint: "test-stable-fingerprint", rawDescription: "local fixture", currency: "KRW" }] };
    const results = await Promise.all([importGooglePayments(payload), importGooglePayments(payload)]);
    expect(results.reduce((sum, result) => sum + result.inserted, 0)).toBe(1);
    const id = `import-${createHash("sha256").update("test-stable-fingerprint").digest("hex")}`;
    const doc = await getAdminDb().doc(`users/${viewer.uid}/gacha/main/payments/${id}`).get();
    expect(doc.get("amount")).toBe(8000);
    expect(doc.get("id")).toBeUndefined();
    expect(doc.get("user_id")).toBeUndefined();
  });

  it("does not trust an input user_id to select the owner", async () => {
    await createPayment(form({ userGameId: "genshin-impact", user_id: "victim", amount: 1234, type: "gacha" }));
    expect((await getAdminDb().collection(`users/${viewer.uid}/gacha/main/payments`).get()).size).toBe(1);
    expect((await getAdminDb().collection("users/victim/gacha/main/payments").get()).size).toBe(0);
  });

  it("uses persisted monthly payments for the existing budget warning calculation", async () => {
    const { getDashboardData } = await import("@/lib/dashboard-data");
    await upsertBudget(form({ yearMonth: getMonthRange().yearMonth, totalBudget: 10000, warningAt: 70 }));
    await createPayment(form({ userGameId: "genshin-impact", amount: 7000, type: "gacha" }));
    const data = await getDashboardData();
    if (!data?.budget) throw new Error("Expected persisted budget");
    expect(data.isDemo).toBe(false);
    expect(getBudgetWarningLevel(getMonthlySpend(data.payments), data.budget.total_budget, data.budget.warning_at).level).toBe("warning");
  });

  it("applies a monthly template once under concurrent retries", async () => {
    await createPaymentTemplate(form({ userGameId: "genshin-impact", name: "월정액", amount: 5900, type: "pass", dayOfMonth: 1 }));
    await Promise.all([applyMonthlyTemplates(), applyMonthlyTemplates()]);
    const payments = await getAdminDb().collection(`users/${viewer.uid}/gacha/main/payments`).get();
    expect(payments.size).toBe(1);
    expect(payments.docs[0].id).toMatch(/^template-.+-\d{4}-\d{2}$/);
  });

  it("recalculates historical pity, downstream pulls, session totals and the game cache", async () => {
    const db = getAdminDb();
    const now = Timestamp.now();
    await db.doc("modules/gacha/banners/test-banner").set({
      game_id: "genshin-impact", name: "Fixture", banner_type: "character", featured: "Fixture",
      starts_at: now, ends_at: Timestamp.fromMillis(now.toMillis() + 86400000), soft_pity: 75,
      hard_pity: 90, base_rate: 0.006, rate_up: 0.5, is_active: true, is_public: true,
      created_by: null, source: "test", source_url: null, schema_version: 1, created_at: now, updated_at: now,
    });
    await trackBanner(form({ bannerId: "test-banner" }));
    const trackingId = "public-test-banner";
    await createPullSession(form({ userBannerId: trackingId, pullsCount: 3, rarity: 3, costPerPull: 100, pulledAt: "2026-01-01T00:00:00.000Z" }));
    const prefix = `users/${viewer.uid}/gacha/main`;
    const pulls = (await db.collection(`${prefix}/pulls`).orderBy("pull_number").get()).docs;
    expect(pulls.map((pull) => pull.get("pity_before"))).toEqual([7, 8, 9]);
    await updatePullResult(form({ id: pulls[0].id, rarity: 5, itemName: "5성" }));
    const after = (await db.collection(`${prefix}/pulls`).orderBy("pull_number").get()).docs;
    expect(after.map((pull) => pull.get("pity_before"))).toEqual([7, 0, 1]);
    expect((await db.doc(`${prefix}/userBanners/${trackingId}`).get()).get("current_pity")).toBe(2);
    await deletePull(form({ id: pulls[1].id }));
    const session = (await db.collection(`${prefix}/pullSessions`).get()).docs[0];
    expect(session.get("pulls_count")).toBe(2);
    expect(session.get("total_cost")).toBe(200);
    expect((await db.doc(`${prefix}/gameStates/genshin-impact`).get()).get("current_pity")).toBe(1);
    expect((await db.doc(`${prefix}/pulls/${pulls[2].id}`).get()).get("pity_before")).toBe(0);
  });
});
