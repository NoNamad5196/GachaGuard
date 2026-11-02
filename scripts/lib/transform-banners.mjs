import { toTimestampObj } from "./dates.mjs";
import { getTrackingId } from "./identity.mjs";
import { deriveInitialPity } from "./pity.mjs";

export function transformBanners(banners, resolvedGamesMap, resolveUser, now, addOp, errors, bannerLookup, schemaVersion) {
  for (const b of banners) {
    const resolvedGame = resolvedGamesMap.get(String(b.game_id));
    if (!resolvedGame) {
      errors.push("[banners:" + b.id + "] Referenced game_id '" + b.game_id + "' not found");
      continue;
    }

    const isPublic = b.is_public !== false && !b.created_by;
    let targetUid = null;

    if (!isPublic) {
      const userMeta = resolveUser(b.created_by, "banners:" + b.id);
      if (!userMeta) continue;
      targetUid = userMeta.uid;
    }

    const bannerId = String(b.id);
    bannerLookup.set(String(b.id), {
      bannerId,
      isPublic,
      targetGameId: resolvedGame.id,
      createdByUid: targetUid,
    });

    const bannerDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(b.created_at, now),
      updated_at: toTimestampObj(b.updated_at, now),
      game_id: resolvedGame.id,
      name: b.name,
      banner_type: b.banner_type || "character",
      featured: b.featured,
      starts_at: toTimestampObj(b.starts_at, now),
      ends_at: toTimestampObj(b.ends_at, now),
      soft_pity: b.soft_pity != null ? Number(b.soft_pity) : null,
      hard_pity: Number(b.hard_pity),
      base_rate: Number(b.base_rate),
      rate_up: Number(b.rate_up),
      is_active: b.is_active !== undefined ? Boolean(b.is_active) : true,
      is_public: isPublic,
      created_by: targetUid,
      source: b.source || "manual",
      source_url: b.source_url ?? null,
    };

    if (isPublic) {
      addOp("modules/gacha/banners/" + bannerId, bannerDoc, "publicBanner", "set");
    } else {
      addOp("users/" + targetUid + "/gacha/main/banners/" + bannerId, bannerDoc, "privateBanner", "set");
    }
  }
}

export function transformUserBanners(
  userBanners,
  userGameLookup,
  bannerLookup,
  pullsByUb,
  resolveUser,
  now,
  addOp,
  errors,
  warnings,
  userBannerLookup,
  schemaVersion
) {
  for (const ub of userBanners) {
    const userMeta = resolveUser(ub.user_id, "user_banners:" + ub.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const userGame = userGameLookup.get(String(ub.user_game_id));
    if (!userGame) {
      errors.push(
        "[user_banners:" + ub.id + "] Referenced user_game_id '" + ub.user_game_id + "' not found"
      );
      continue;
    }

    const banner = bannerLookup.get(String(ub.banner_id));
    if (!banner) {
      errors.push(
        "[user_banners:" + ub.id + "] Referenced banner_id '" + ub.banner_id + "' not found"
      );
      continue;
    }

    const bannerScope = banner.isPublic ? "public" : "private";
    const trackingId = getTrackingId(bannerScope, banner.bannerId);

    userBannerLookup.set(String(ub.id), {
      trackingId,
      uid,
      entryId: userGame.entryId,
      targetGameId: userGame.gameId,
      bannerId: banner.bannerId,
    });

    const bannerPulls = pullsByUb.get(String(ub.id)) || [];
    const pityResult = deriveInitialPity(ub, bannerPulls);

    if (pityResult.error) {
      errors.push(pityResult.error);
      continue;
    }

    if (pityResult.derived && pityResult.reason !== "zero_pulls") {
      warnings.push(`[user_banners:${ub.id}] Derived initial_pity=${pityResult.value} (${pityResult.reason})`);
    }

    const userBannerDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(ub.created_at, now),
      updated_at: toTimestampObj(ub.updated_at, now),
      user_game_id: userGame.entryId,
      game_id: userGame.gameId,
      banner_id: banner.bannerId,
      banner_scope: bannerScope,
      initial_pity: pityResult.value,
      current_pity: ub.current_pity != null ? Number(ub.current_pity) : 0,
      pulls_total: ub.pulls_total != null ? Number(ub.pulls_total) : 0,
      pulls_5_star: ub.pulls_5_star != null ? Number(ub.pulls_5_star) : 0,
      is_tracking: ub.is_tracking !== undefined ? Boolean(ub.is_tracking) : true,
      revision: 1,
    };

    addOp(
      "users/" + uid + "/gacha/main/userBanners/" + trackingId,
      userBannerDoc,
      "userBanner",
      "set"
    );
  }
}
