import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Run through test:emulator; real projects are prohibited.");
  }
  environment = await initializeTestEnvironment({
    projectId: "demo-otakus",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/alice/gacha/main/payments/private"), { amount: 5000 });
    await setDoc(doc(context.firestore(), "users/alice/agentSignals/private"), { kind: "manual_sync" });
  });
});

afterAll(async () => { await environment?.cleanup(); });

describe("OtakuS ownership isolation", () => {
  it("allows the owner to read private payments", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    const result = await assertSucceeds(getDoc(doc(db, "users/alice/gacha/main/payments/private")));
    expect(result.data()?.amount).toBe(5000);
  });

  it("rejects another user's payment reads", async () => {
    const db = environment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice/gacha/main/payments/private")));
  });

  it("rejects anonymous reads", async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice/gacha/main/payments/private")));
  });

  it("rejects even owner browser writes to server-managed payments", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users/alice/gacha/main/payments/private"), { amount: 1 }));
  });

  it("isolates agent signals and prevents browser injection", async () => {
    const db = environment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice/agentSignals/private")));
    await assertFails(setDoc(doc(db, "users/bob/agentSignals/injected"), { kind: "spending_alert" }));
  });
});
