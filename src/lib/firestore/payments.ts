import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import type {
  googlePaymentImportRowSchema,
  googlePaymentImportSchema,
  paymentSchema,
  updatePaymentSchema,
} from "../domain/schemas";
import {
  paymentDocPath,
  paymentsColPath,
  userGameDocPath,
} from "./paths";

export function buildGooglePaymentMemo(row: {
  source: "google_play" | "google_pay";
  externalOrderId?: string | null;
  merchant?: string | null;
  rawDescription: string;
}): string {
  const sourceLabel = row.source === "google_play" ? "Google Play" : "Google Pay";
  const detail = [row.merchant, row.rawDescription, row.externalOrderId]
    .filter(Boolean)
    .join(" · ");

  return `${sourceLabel} 가져오기${detail ? ` · ${detail}` : ""}`.slice(0, 500);
}

export async function createPayment(
  uid: string,
  input: z.infer<typeof paymentSchema>,
): Promise<{ id: string }> {
  const db = getAdminDb();
  return await db.runTransaction(async (tx) => {
    const ugRef = db.doc(userGameDocPath(uid, input.userGameId));
    const ugSnap = await tx.get(ugRef);
    if (!ugSnap.exists) {
      throw new Error("선택한 게임을 확인할 수 없습니다.");
    }

    const paymentId = db.collection(paymentsColPath(uid)).doc().id;
    const pRef = db.doc(paymentDocPath(uid, paymentId));
    const now = Timestamp.now();
    const paidAtDate = input.paidAt ? new Date(input.paidAt) : new Date();

    tx.create(pRef, {
      user_game_id: input.userGameId,
      amount: input.amount,
      type: input.type,
      paid_at: Timestamp.fromDate(paidAtDate),
      memo: input.memo || null,
      regret_score: input.regretScore ?? null,
      source: "manual",
      external_order_id: null,
      import_fingerprint: null,
      merchant: null,
      raw_description: null,
      currency: "KRW",
      imported_at: null,
      schema_version: 1,
      created_at: now,
      updated_at: now,
    });

    return { id: paymentId };
  });
}

export async function updatePayment(
  uid: string,
  input: z.infer<typeof updatePaymentSchema>,
): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const pRef = db.doc(paymentDocPath(uid, input.id));
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists) {
      throw new Error("결제 정보를 찾을 수 없습니다.");
    }

    if (input.userGameId) {
      const ugRef = db.doc(userGameDocPath(uid, input.userGameId));
      const ugSnap = await tx.get(ugRef);
      if (!ugSnap.exists) {
        throw new Error("선택한 게임을 확인할 수 없습니다.");
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: Timestamp.now(),
    };
    if (input.userGameId !== undefined) updates.user_game_id = input.userGameId;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.type !== undefined) updates.type = input.type;
    if (input.paidAt !== undefined) {
      updates.paid_at = Timestamp.fromDate(new Date(input.paidAt));
    }
    if (input.memo !== undefined) updates.memo = input.memo || null;
    if (input.regretScore !== undefined) {
      updates.regret_score = input.regretScore ?? null;
    }

    tx.update(pRef, updates);
  });
}

export async function deletePayment(uid: string, paymentId: string): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const pRef = db.doc(paymentDocPath(uid, paymentId));
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists) {
      throw new Error("결제 정보를 찾을 수 없습니다.");
    }
    tx.delete(pRef);
  });
}

export async function importGooglePayments(
  uid: string,
  input: z.infer<typeof googlePaymentImportSchema>,
): Promise<{ inserted: number; skippedDuplicates: number }> {
  if (input.rows.length > 450) {
    throw new Error("가져오기 항목이 450개를 초과했습니다.");
  }

  const db = getAdminDb();
  return await db.runTransaction(async (tx) => {
    const userGameIds = Array.from(new Set(input.rows.map((r) => r.userGameId)));
    for (const ugId of userGameIds) {
      const ugRef = db.doc(userGameDocPath(uid, ugId));
      const ugSnap = await tx.get(ugRef);
      if (!ugSnap.exists) {
        throw new Error("선택한 게임을 확인할 수 없습니다.");
      }
    }

    const seenFingerprints = new Set<string>();
    const rowsToInsert: Array<{
      paymentId: string;
      row: z.infer<typeof googlePaymentImportRowSchema>;
    }> = [];
    let skippedDuplicates = 0;

    for (const row of input.rows) {
      if (seenFingerprints.has(row.importFingerprint)) {
        skippedDuplicates++;
        continue;
      }
      seenFingerprints.add(row.importFingerprint);

      const hash = crypto
        .createHash("sha256")
        .update(row.importFingerprint, "utf8")
        .digest("hex");
      const paymentId = `import-${hash}`;
      const pRef = db.doc(paymentDocPath(uid, paymentId));
      const pSnap = await tx.get(pRef);

      if (pSnap.exists) {
        if (pSnap.get("import_fingerprint") !== row.importFingerprint) {
          throw new Error("가져오기 지문 충돌이 발생했습니다.");
        }
        skippedDuplicates++;
        continue;
      }

      rowsToInsert.push({ paymentId, row });
    }

    const now = Timestamp.now();
    for (const { paymentId, row } of rowsToInsert) {
      const pRef = db.doc(paymentDocPath(uid, paymentId));
      tx.create(pRef, {
        user_game_id: row.userGameId,
        amount: row.amount,
        type: row.type,
        paid_at: Timestamp.fromDate(new Date(row.paidAt)),
        memo: buildGooglePaymentMemo(row),
        regret_score: null,
        source: row.source,
        external_order_id: row.externalOrderId ?? null,
        import_fingerprint: row.importFingerprint,
        merchant: row.merchant ?? null,
        raw_description: row.rawDescription,
        currency: row.currency,
        imported_at: now,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }

    return {
      inserted: rowsToInsert.length,
      skippedDuplicates,
    };
  });
}
