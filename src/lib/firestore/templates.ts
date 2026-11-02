import crypto from "node:crypto";
import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import { getMonthRange } from "../domain/calculations";
import type { templateSchema } from "../domain/schemas";
import {
  paymentDocPath,
  paymentTemplateDocPath,
  paymentTemplatesColPath,
  userGameDocPath,
} from "./paths";
import {
  paymentTemplateStoredSchema,
  sharedUserGameStoredSchema,
} from "./mutation-documents";

export async function createPaymentTemplate(
  uid: string,
  input: z.infer<typeof templateSchema>,
): Promise<{ id: string }> {
  const db = getAdminDb();
  const templateId = crypto
    .createHash("sha256")
    .update(JSON.stringify([input.userGameId, input.name, input.dayOfMonth]))
    .digest("hex")
    .slice(0, 24);

  return await db.runTransaction(async (tx) => {
    const ugRef = db.doc(userGameDocPath(uid, input.userGameId));
    const ugSnap = await tx.get(ugRef);
    if (!ugSnap.exists) {
      throw new Error("선택한 게임을 확인할 수 없습니다.");
    }
    const ugData = sharedUserGameStoredSchema.parse(ugSnap.data());
    if (ugData.user_id !== uid) {
      throw new Error("선택한 게임의 소유권이 없습니다.");
    }

    const tRef = db.doc(paymentTemplateDocPath(uid, templateId));
    const tSnap = await tx.get(tRef);

    const now = Timestamp.now();

    if (tSnap.exists) {
      tx.update(tRef, {
        user_game_id: input.userGameId,
        name: input.name,
        amount: input.amount,
        type: input.type,
        day_of_month: input.dayOfMonth,
        is_active: true,
        updated_at: now,
      });
    } else {
      tx.set(tRef, {
        user_game_id: input.userGameId,
        name: input.name,
        amount: input.amount,
        type: input.type,
        day_of_month: input.dayOfMonth,
        is_active: true,
        last_applied_year_month: null,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }

    return { id: templateId };
  });
}

export async function applyMonthlyTemplates(uid: string): Promise<void> {
  const db = getAdminDb();
  const { yearMonth, year, month } = getMonthRange();

  await db.runTransaction(async (tx) => {
    const templatesSnap = await tx.get(
      db.collection(paymentTemplatesColPath(uid)).where("is_active", "==", true).limit(200),
    );

    const targets = templatesSnap.docs.filter((doc) => {
      const data = paymentTemplateStoredSchema.parse(doc.data());
      return data.last_applied_year_month !== yearMonth;
    });

    if (targets.length === 0) {
      return;
    }

    if (targets.length * 2 > 450) {
      throw new Error("반복 결제 작업이 트랜잭션 한도(450건)를 초과했습니다.");
    }

    const userGameMap = new Map<string, z.infer<typeof sharedUserGameStoredSchema>>();
    const paymentSnapMap = new Map<string, DocumentSnapshot>();

    const uniqueUgIds = Array.from(new Set(targets.map((doc) => doc.data().user_game_id as string)));
    for (const ugId of uniqueUgIds) {
      const ugRef = db.doc(userGameDocPath(uid, ugId));
      const ugSnap = await tx.get(ugRef);
      if (!ugSnap.exists) {
        throw new Error("선택한 게임을 확인할 수 없습니다.");
      }
      const ugData = sharedUserGameStoredSchema.parse(ugSnap.data());
      if (ugData.user_id !== uid) {
        throw new Error("선택한 게임의 소유권이 없습니다.");
      }
      userGameMap.set(ugId, ugData);
    }

    for (const doc of targets) {
      const paymentId = `template-${doc.id}-${yearMonth}`;
      const pRef = db.doc(paymentDocPath(uid, paymentId));
      const pSnap = await tx.get(pRef);
      paymentSnapMap.set(doc.id, pSnap);
    }

    const now = Timestamp.now();
    for (const doc of targets) {
      const template = paymentTemplateStoredSchema.parse(doc.data());
      const paymentId = `template-${doc.id}-${yearMonth}`;
      const pRef = db.doc(paymentDocPath(uid, paymentId));
      const pSnap = paymentSnapMap.get(doc.id)!;

      if (!pSnap.exists) {
        const paidAtDate = new Date(
          Date.UTC(year, month - 1, template.day_of_month, -9),
        );
        tx.set(pRef, {
          user_game_id: template.user_game_id,
          amount: template.amount,
          type: template.type,
          paid_at: Timestamp.fromDate(paidAtDate),
          memo: `${template.name} 자동 반복`,
          regret_score: null,
          source: "template",
          external_order_id: paymentId,
          import_fingerprint: null,
          merchant: null,
          raw_description: null,
          currency: "KRW",
          imported_at: null,
          schema_version: 1,
          created_at: now,
          updated_at: now,
        });
      }

      tx.update(doc.ref, {
        last_applied_year_month: yearMonth,
        updated_at: now,
      });
    }
  });
}
