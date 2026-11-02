import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import type { pullSessionSchema, updatePullSchema } from "@/lib/domain/schemas";
import { PullHistoryError, pullDocumentSchema, readPullHistory, sessionDocumentSchema, writePullHistory } from "./pull-state";

export async function createPullSession(uid: string, input: z.infer<typeof pullSessionSchema>) {
  const db = getAdminDb();
  const sessionId = db.collection(`users/${uid}/gacha/main/pullSessions`).doc().id;
  return db.runTransaction(async (tx) => {
    const history = await readPullHistory(tx, db, { uid, trackingId: input.userBannerId });
    const now = Timestamp.now();
    const pulledAt = input.pulledAt ? Timestamp.fromDate(new Date(input.pulledAt)) : now;
    const totalCost = input.costPerPull * input.pullsCount;
    if (!Number.isSafeInteger(totalCost)) throw new PullHistoryError("limit", "뽑기 비용이 허용 범위를 초과했습니다.");
    const common = { user_banner_id: input.userBannerId, user_game_id: history.tracking.user_game_id,
      pulled_at: pulledAt, schema_version: 1, created_at: now, updated_at: now };
    history.sessionMap.set(sessionId, sessionDocumentSchema.parse({ ...common,
      pulls_count: input.pullsCount, total_cost: totalCost, currency: "KRW", memo: input.memo || null }));
    for (let number = 1; number <= input.pullsCount; number++) {
      const result = number === input.pullsCount;
      const rarity = result ? input.rarity : 3;
      history.pullMap.set(`${sessionId}-${number}`, pullDocumentSchema.parse({ ...common,
        pull_session_id: sessionId, pull_number: number, pity_before: 0, rarity,
        item_name: result ? input.itemName || `${rarity}성 결과` : "일반 결과",
        cost: input.costPerPull, is_rate_up: rarity === 5 ? input.isRateUp ?? null : null,
      }));
    }
    writePullHistory(tx, history);
    return { sessionId };
  });
}

export async function updatePullResult(uid: string, input: z.infer<typeof updatePullSchema>) {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const pull = pullDocumentSchema.parse((await tx.get(db.doc(`users/${uid}/gacha/main/pulls/${input.id}`))).data());
    const history = await readPullHistory(tx, db, { uid, trackingId: pull.user_banner_id });
    if (!history.pullMap.has(input.id)) throw new PullHistoryError("reference", "뽑기 이력을 확인할 수 없습니다.");
    history.pullMap.set(input.id, { ...pull, rarity: input.rarity, item_name: input.itemName || null,
      is_rate_up: input.rarity === 5 ? input.isRateUp ?? null : null });
    writePullHistory(tx, history);
  });
}

export async function deletePull(uid: string, pullId: string) {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const pull = pullDocumentSchema.parse((await tx.get(db.doc(`users/${uid}/gacha/main/pulls/${pullId}`))).data());
    const history = await readPullHistory(tx, db, { uid, trackingId: pull.user_banner_id });
    if (!history.pullMap.delete(pullId)) throw new PullHistoryError("reference", "뽑기 이력을 확인할 수 없습니다.");
    history.removed.add(pullId);
    writePullHistory(tx, history);
  });
}
