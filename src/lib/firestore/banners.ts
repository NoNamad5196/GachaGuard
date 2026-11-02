import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import { getAdminDb } from "../firebase/admin";
import type { customBannerSchema, trackBannerSchema } from "../domain/schemas";
import { ensureUserGameInTx } from "./games";
import {
  gameDocPath,
  privateBannerDocPath,
  publicBannerDocPath,
  userBannerDocPath,
} from "./paths";
import {
  bannerStoredSchema,
  gameConfigStoredSchema,
  masterGameStoredSchema,
  userBannerStoredSchema,
} from "./mutation-documents";

export function dateToKstIso(date: string, boundary: "start" | "end"): string {
  return `${date}T${boundary === "start" ? "00:00:00" : "23:59:59"}+09:00`;
}

export async function createCustomBanner(
  uid: string,
  input: z.infer<typeof customBannerSchema>,
): Promise<{ bannerId: string }> {
  const startsAt = dateToKstIso(input.startsAtDate, "start");
  const endsAt = dateToKstIso(input.endsAtDate, "end");

  if (new Date(startsAt) > new Date(endsAt)) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }

  const db = getAdminDb();
  const endsAtIso = new Date(endsAt).toISOString();
  const bannerId = crypto
    .createHash("sha256")
    .update(JSON.stringify([input.gameId, input.name, endsAtIso]))
    .digest("hex");

  await db.runTransaction(async (tx) => {
    // 1. Validate master game exists
    const gameRef = db.doc(gameDocPath(input.gameId));
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) {
      throw new Error(`존재하지 않는 마스터 게임입니다: ${input.gameId}`);
    }
    masterGameStoredSchema.parse(gameSnap.data());

    // 2. Read config from modules/gacha/gameConfigs
    const configRef = db.doc(`modules/gacha/gameConfigs/${input.gameId}`);
    const configSnap = await tx.get(configRef);
    let softPityFallback: number | null = null;
    let hardPityFallback = 90;
    if (configSnap.exists) {
      const configData = gameConfigStoredSchema.parse(configSnap.data());
      softPityFallback = configData.soft_pity ?? null;
      hardPityFallback = configData.hard_pity ?? 90;
    }

    // 3. Read existing private banner (deterministic create-only / preserve metadata on retry)
    const bRef = db.doc(privateBannerDocPath(uid, bannerId));
    const bSnap = await tx.get(bRef);

    // 4. Prepare user game plan (all reads inside)
    const userGamePlan = await ensureUserGameInTx(tx, db, uid, input.gameId);

    // 5. Read tracking doc (userBanner)
    const trackingId = `private-${bannerId}`;
    const ubRef = db.doc(userBannerDocPath(uid, trackingId));
    const ubSnap = await tx.get(ubRef);
    let existingUserBanner: z.infer<typeof userBannerStoredSchema> | null = null;
    if (ubSnap.exists) {
      existingUserBanner = userBannerStoredSchema.parse(ubSnap.data());
    }

    // ALL READS ARE COMPLETE - BEGIN WRITES
    const now = Timestamp.now();

    if (!bSnap.exists) {
      tx.set(bRef, {
        game_id: input.gameId,
        name: input.name,
        banner_type: input.bannerType,
        featured: input.featured,
        starts_at: Timestamp.fromDate(new Date(startsAt)),
        ends_at: Timestamp.fromDate(new Date(endsAt)),
        soft_pity: input.softPity ?? softPityFallback,
        hard_pity: input.hardPity ?? hardPityFallback,
        base_rate: input.baseRate ?? 0.006,
        rate_up: input.rateUp ?? 0.5,
        is_active: true,
        is_public: false,
        created_by: uid,
        source: "user",
        source_url: input.sourceUrl ?? null,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }

    userGamePlan.apply(tx);

    if (existingUserBanner) {
      tx.update(ubRef, {
        is_tracking: true,
        revision: (existingUserBanner.revision ?? 0) + 1,
        updated_at: now,
      });
    } else {
      tx.set(ubRef, {
        user_game_id: userGamePlan.id,
        game_id: input.gameId,
        banner_id: bannerId,
        banner_scope: "private",
        initial_pity: userGamePlan.currentPity,
        current_pity: userGamePlan.currentPity,
        pulls_total: 0,
        pulls_5_star: 0,
        is_tracking: true,
        revision: 0,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }
  });

  return { bannerId };
}

export async function trackBanner(
  uid: string,
  input: z.infer<typeof trackBannerSchema>,
): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const publicRef = db.doc(publicBannerDocPath(input.bannerId));
    const publicSnap = await tx.get(publicRef);

    let bannerData: z.infer<typeof bannerStoredSchema> | null = null;
    let scope: "public" | "private" = "public";

    if (publicSnap.exists) {
      bannerData = bannerStoredSchema.parse(publicSnap.data());
      if (!bannerData.is_public) {
        throw new Error("공개 배너가 아닙니다.");
      }
    } else {
      const privateRef = db.doc(privateBannerDocPath(uid, input.bannerId));
      const privateSnap = await tx.get(privateRef);
      if (privateSnap.exists) {
        bannerData = bannerStoredSchema.parse(privateSnap.data());
        if (bannerData.created_by !== uid) {
          throw new Error("배너에 대한 접근 권한이 없습니다.");
        }
        scope = "private";
      }
    }

    if (!bannerData) {
      throw new Error("배너를 찾을 수 없습니다.");
    }

    const userGamePlan = await ensureUserGameInTx(tx, db, uid, bannerData.game_id);

    const trackingId = `${scope}-${input.bannerId}`;
    const ubRef = db.doc(userBannerDocPath(uid, trackingId));
    const ubSnap = await tx.get(ubRef);
    let existingUserBanner: z.infer<typeof userBannerStoredSchema> | null = null;
    if (ubSnap.exists) {
      existingUserBanner = userBannerStoredSchema.parse(ubSnap.data());
    }

    // ALL READS ARE COMPLETE - BEGIN WRITES
    const now = Timestamp.now();

    userGamePlan.apply(tx);

    if (existingUserBanner) {
      tx.update(ubRef, {
        is_tracking: true,
        revision: (existingUserBanner.revision ?? 0) + 1,
        updated_at: now,
      });
    } else {
      tx.set(ubRef, {
        user_game_id: userGamePlan.id,
        game_id: bannerData.game_id,
        banner_id: input.bannerId,
        banner_scope: scope,
        initial_pity: userGamePlan.currentPity,
        current_pity: userGamePlan.currentPity,
        pulls_total: 0,
        pulls_5_star: 0,
        is_tracking: true,
        revision: 0,
        schema_version: 1,
        created_at: now,
        updated_at: now,
      });
    }
  });
}
