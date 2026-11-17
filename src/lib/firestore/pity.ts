import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import type { gachaLogSchema, pitySchema } from "../domain/schemas";
import {
  gachaLogDocPath,
  gachaLogsColPath,
  gameStateDocPath,
  pullsColPath,
  userBannerDocPath,
  userGameDocPath,
} from "./paths";
import {
  gameStateStoredSchema,
  sharedUserGameStoredSchema,
  userBannerStoredSchema,
} from "./mutation-documents";

export async function updatePity(
  uid: string,
  input: z.infer<typeof pitySchema>,
): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const ugRef = db.doc(userGameDocPath(uid, input.userGameId));
    const ugSnap = await tx.get(ugRef);
    if (!ugSnap.exists) {
      throw new Error("선택한 게임을 확인할 수 없습니다.");
    }
    const ugData = sharedUserGameStoredSchema.parse(ugSnap.data());
    if (ugData.user_id !== uid) {
      throw new Error("선택한 게임의 소유권이 없습니다.");
    }

    const gsRef = db.doc(gameStateDocPath(uid, input.userGameId));
    const gsSnap = await tx.get(gsRef);
    let existingGameState: z.infer<typeof gameStateStoredSchema> | null = null;
    if (gsSnap.exists) {
      existingGameState = gameStateStoredSchema.parse(gsSnap.data());
    }

    let ubRef: ReturnType<typeof db.doc> | null = null;
    let existingUserBanner: z.infer<typeof userBannerStoredSchema> | null = null;
    let hasHistory = false;

    if (existingGameState?.last_user_banner_id) {
      ubRef = db.doc(userBannerDocPath(uid, existingGameState.last_user_banner_id));
      const ubSnap = await tx.get(ubRef);
      if (ubSnap.exists) {
        existingUserBanner = userBannerStoredSchema.parse(ubSnap.data());
        const pullsSnap = await tx.get(
          db.collection(pullsColPath(uid)).where("user_banner_id", "==", existingGameState.last_user_banner_id).limit(1),
        );
        hasHistory = existingUserBanner.pulls_total > 0 || !pullsSnap.empty;
      }
    }

    if (hasHistory) {
      throw new Error("뽑기 이력이 존재하는 배너는 천장을 직접 수정할 수 없습니다.");
    }

    const nowTs = Timestamp.now();

    if (existingGameState) {
      tx.update(gsRef, {
        current_pity: input.currentPity,
        revision: (existingGameState.revision ?? 0) + 1,
        updated_at: nowTs,
      });
    } else {
      tx.set(gsRef, {
        user_game_id: input.userGameId,
        game_id: ugData.game_id,
        nickname: null,
        current_pity: input.currentPity,
        monthly_budget: 0,
        warning_threshold_percent: 70,
        is_active: true,
        revision: 0,
        last_user_banner_id: null,
        schema_version: 1,
        created_at: nowTs,
        updated_at: nowTs,
      });
    }

    if (ubRef && existingUserBanner) {
      tx.update(ubRef, {
        initial_pity: input.currentPity,
        current_pity: input.currentPity,
        revision: (existingUserBanner.revision ?? 0) + 1,
        updated_at: nowTs,
      });
    }
  });
}

export async function createGachaLog(
  uid: string,
  input: z.infer<typeof gachaLogSchema>,
): Promise<{ id: string }> {
  const db = getAdminDb();
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

    const gsRef = db.doc(gameStateDocPath(uid, input.userGameId));
    const gsSnap = await tx.get(gsRef);
    let existingGameState: z.infer<typeof gameStateStoredSchema> | null = null;
    if (gsSnap.exists) {
      existingGameState = gameStateStoredSchema.parse(gsSnap.data());
    }

    if (existingGameState?.last_user_banner_id) {
      const ubRef = db.doc(userBannerDocPath(uid, existingGameState.last_user_banner_id));
      const ubSnap = await tx.get(ubRef);
      if (ubSnap.exists) {
        const ubData = userBannerStoredSchema.parse(ubSnap.data());
        const pullsSnap = await tx.get(
          db.collection(pullsColPath(uid)).where("user_banner_id", "==", existingGameState.last_user_banner_id).limit(1),
        );
        if (ubData.pulls_total > 0 || !pullsSnap.empty) {
          throw new Error("뽑기 이력이 추적 중인 게임에는 레거시 가챠 로그로 천장을 변경할 수 없습니다.");
        }
      }
    }

    const logId = db.collection(gachaLogsColPath(uid)).doc().id;
    const logRef = db.doc(gachaLogDocPath(uid, logId));
    const nowTs = Timestamp.now();
    const pulledAtDate = input.pulledAt ? new Date(input.pulledAt) : new Date();

    tx.set(logRef, {
      user_game_id: input.userGameId,
      pulls: input.pulls,
      result: input.result || null,
      pity_at_pull: input.pityAtPull,
      pulled_at: Timestamp.fromDate(pulledAtDate),
      schema_version: 1,
      created_at: nowTs,
      updated_at: nowTs,
    });

    const newPity = input.pityAtPull + input.pulls;
    if (existingGameState) {
      tx.update(gsRef, {
        current_pity: newPity,
        revision: (existingGameState.revision ?? 0) + 1,
        updated_at: nowTs,
      });
    } else {
      tx.set(gsRef, {
        user_game_id: input.userGameId,
        game_id: ugData.game_id,
        nickname: null,
        current_pity: newPity,
        monthly_budget: 0,
        warning_threshold_percent: 70,
        is_active: true,
        revision: 0,
        last_user_banner_id: null,
        schema_version: 1,
        created_at: nowTs,
        updated_at: nowTs,
      });
    }

    return { id: logId };
  });
}
