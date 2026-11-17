import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import type {
  budgetSchema,
  guardrailRuleSchema,
  toggleGuardrailRuleSchema,
} from "../domain/schemas";
import {
  budgetDocPath,
  guardrailRuleDocPath,
  guardrailRulesColPath,
} from "./paths";

export async function upsertBudget(
  uid: string,
  input: z.infer<typeof budgetSchema>,
): Promise<void> {
  const db = getAdminDb();
  const bRef = db.doc(budgetDocPath(uid, input.yearMonth));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bRef);
    const now = Timestamp.now();

    if (snap.exists) {
      tx.update(bRef, {
        total_budget: input.totalBudget,
        warning_at: input.warningAt,
        updated_at: now,
      });
    } else {
      tx.set(bRef, {
        year_month: input.yearMonth,
        total_budget: input.totalBudget,
        warning_at: input.warningAt,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }
  });
}

export async function upsertGuardrailRule(
  uid: string,
  input: z.infer<typeof guardrailRuleSchema>,
): Promise<void> {
  const db = getAdminDb();
  const ruleId = input.id || db.collection(guardrailRulesColPath(uid)).doc().id;
  const rRef = db.doc(guardrailRuleDocPath(uid, ruleId));

  await db.runTransaction(async (tx) => {
    const now = Timestamp.now();
    const snap = await tx.get(rRef);

    if (snap.exists) {
      tx.update(rRef, {
        kind: input.kind,
        name: input.name,
        threshold_amount: input.thresholdAmount ?? null,
        threshold_percent: input.thresholdPercent ?? null,
        cooldown_days: input.cooldownDays ?? null,
        enabled: input.enabled,
        updated_at: now,
      });
    } else {
      tx.set(rRef, {
        kind: input.kind,
        name: input.name,
        threshold_amount: input.thresholdAmount ?? null,
        threshold_percent: input.thresholdPercent ?? null,
        cooldown_days: input.cooldownDays ?? null,
        enabled: input.enabled,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }
  });
}

export async function toggleGuardrailRule(
  uid: string,
  input: z.infer<typeof toggleGuardrailRuleSchema>,
): Promise<void> {
  const db = getAdminDb();
  const rRef = db.doc(guardrailRuleDocPath(uid, input.id));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rRef);
    if (!snap.exists) {
      throw new Error("보호 규칙을 찾을 수 없습니다.");
    }

    tx.update(rRef, {
      enabled: input.enabled,
      updated_at: Timestamp.now(),
    });
  });
}
