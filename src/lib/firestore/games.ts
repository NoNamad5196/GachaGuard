import { Timestamp, type Transaction, type Firestore } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import type { userGameSchema } from "../domain/schemas";
import { createDefaultSharedGame } from "./catalog";
import {
  gameDocPath,
  gameStateDocPath,
  pullsColPath,
  userBannerDocPath,
  userGameDocPath,
  userGamesColPath,
} from "./paths";
import {
  gameStateStoredSchema,
  masterGameStoredSchema,
  sharedUserGameStoredSchema,
  userBannerStoredSchema,
} from "./mutation-documents";

export interface UserGamePlan {
  id: string;
  currentPity: number;
  apply: (tx: Transaction) => void;
}

export async function ensureUserGameInTx(
  tx: Transaction,
  db: Firestore,
  uid: string,
  gameId: string,
): Promise<UserGamePlan> {
  const gameRef = db.doc(gameDocPath(gameId));
  const gameSnap = await tx.get(gameRef);
  if (!gameSnap.exists) {
    throw new Error(`존재하지 않는 마스터 게임입니다: ${gameId}`);
  }
  const gameData = masterGameStoredSchema.parse(gameSnap.data());
  const gameName = gameData.name;

  const directRef = db.doc(userGameDocPath(uid, gameId));
  const directSnap = await tx.get(directRef);

  let entryId = gameId;
  let isExisting = false;

  if (directSnap.exists) {
    const parsed = sharedUserGameStoredSchema.safeParse(directSnap.data());
    if (parsed.success && parsed.data.user_id === uid && parsed.data.game_id === gameId) {
      entryId = gameId;
      isExisting = true;
    }
  }

  if (!isExisting) {
    const querySnap = await tx.get(
      db.collection(userGamesColPath(uid)).where("game_id", "==", gameId).limit(1),
    );
    if (!querySnap.empty) {
      const docSnap = querySnap.docs[0];
      const parsed = sharedUserGameStoredSchema.safeParse(docSnap.data());
      if (parsed.success && parsed.data.user_id === uid && parsed.data.game_id === gameId) {
        entryId = docSnap.id;
        isExisting = true;
      }
    }
  }

  const gsRef = db.doc(gameStateDocPath(uid, entryId));
  const gsSnap = await tx.get(gsRef);
  let currentPity = 0;
  if (gsSnap.exists) {
    const gsData = gameStateStoredSchema.parse(gsSnap.data());
    currentPity = gsData.current_pity ?? 0;
  }

  const targetUgRef = db.doc(userGameDocPath(uid, entryId));
  return {
    id: entryId,
    currentPity,
    apply: (tx: Transaction) => {
      const nowTs = Timestamp.now();
      if (!isExisting) {
        const defaultGame = createDefaultSharedGame({
          id: entryId,
          userId: uid,
          gameId,
          name: gameName,
        });
        tx.set(targetUgRef, defaultGame);
      }

      if (!gsSnap.exists) {
        tx.set(gsRef, {
          user_game_id: entryId,
          game_id: gameId,
          nickname: null,
          current_pity: currentPity,
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
    },
  };
}

export async function addUserGame(
  uid: string,
  input: z.infer<typeof userGameSchema>,
): Promise<{ id: string }> {
  const db = getAdminDb();
  return await db.runTransaction(async (tx) => {
    const gameRef = db.doc(gameDocPath(input.gameId));
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) {
      throw new Error(`존재하지 않는 마스터 게임입니다: ${input.gameId}`);
    }
    const gameData = masterGameStoredSchema.parse(gameSnap.data());
    const gameName = gameData.name;

    let entryId = input.gameId;
    let isExisting = false;
    const directRef = db.doc(userGameDocPath(uid, input.gameId));
    const directSnap = await tx.get(directRef);

    if (directSnap.exists) {
      const parsed = sharedUserGameStoredSchema.safeParse(directSnap.data());
      if (parsed.success && parsed.data.user_id === uid && parsed.data.game_id === input.gameId) {
        entryId = input.gameId;
        isExisting = true;
      }
    }

    if (!isExisting) {
      const querySnap = await tx.get(
        db.collection(userGamesColPath(uid)).where("game_id", "==", input.gameId).limit(1),
      );
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const parsed = sharedUserGameStoredSchema.safeParse(docSnap.data());
        if (parsed.success && parsed.data.user_id === uid && parsed.data.game_id === input.gameId) {
          entryId = docSnap.id;
          isExisting = true;
        }
      }
    }

    const ugRef = db.doc(userGameDocPath(uid, entryId));
    const gsRef = db.doc(gameStateDocPath(uid, entryId));
    const gsSnap = await tx.get(gsRef);
    let existingGameState: z.infer<typeof gameStateStoredSchema> | null = null;
    if (gsSnap.exists) {
      existingGameState = gameStateStoredSchema.parse(gsSnap.data());
    }

    let existingUserBanner: z.infer<typeof userBannerStoredSchema> | null = null;
    let ubRef: ReturnType<typeof db.doc> | null = null;
    let shouldUpdateUserBanner = false;
    let finalPity = input.currentPity;

    if (existingGameState?.last_user_banner_id) {
      ubRef = db.doc(userBannerDocPath(uid, existingGameState.last_user_banner_id));
      const ubSnap = await tx.get(ubRef);
      if (ubSnap.exists) {
        existingUserBanner = userBannerStoredSchema.parse(ubSnap.data());
        const pullsSnap = await tx.get(
          db.collection(pullsColPath(uid)).where("user_banner_id", "==", existingGameState.last_user_banner_id).limit(1),
        );
        const hasHistory = existingUserBanner.pulls_total > 0 || !pullsSnap.empty;

        if (input.currentPity !== existingGameState.current_pity) {
          if (hasHistory) {
            throw new Error("뽑기 이력이 존재하는 배너는 천장을 직접 수정할 수 없습니다.");
          }
          shouldUpdateUserBanner = true;
          finalPity = input.currentPity;
        } else {
          finalPity = existingGameState.current_pity;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const nowTs = Timestamp.now();

    if (isExisting) {
      tx.update(ugRef, { updated_at: nowIso });
    } else {
      const defaultGame = createDefaultSharedGame({
        id: entryId,
        userId: uid,
        gameId: input.gameId,
        name: input.nickname || gameName,
      });
      tx.set(ugRef, defaultGame);
    }

    if (existingGameState) {
      tx.update(gsRef, {
        nickname: input.nickname || null,
        monthly_budget: input.monthlyBudget,
        current_pity: finalPity,
        warning_threshold_percent: input.warningThresholdPercent,
        is_active: true,
        revision: (existingGameState.revision ?? 0) + 1,
        updated_at: nowTs,
      });
    } else {
      tx.set(gsRef, {
        user_game_id: entryId,
        game_id: input.gameId,
        nickname: input.nickname || null,
        monthly_budget: input.monthlyBudget,
        current_pity: input.currentPity,
        warning_threshold_percent: input.warningThresholdPercent,
        is_active: true,
        revision: 0,
        last_user_banner_id: null,
        schema_version: 1,
        created_at: nowTs,
        updated_at: nowTs,
      });
    }

    if (shouldUpdateUserBanner && ubRef && existingUserBanner) {
      tx.update(ubRef, {
        initial_pity: finalPity,
        current_pity: finalPity,
        revision: (existingUserBanner.revision ?? 0) + 1,
        updated_at: nowTs,
      });
    }

    return { id: entryId };
  });
}
