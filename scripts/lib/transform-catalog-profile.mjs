import { resolveGame } from "./catalog.mjs";
import { toTimestampObj } from "./dates.mjs";
import { getIdentityMappingId } from "./identity.mjs";

export function transformGames(games, resolvedGamesMap, now, addOp, errors, schemaVersion) {
  for (const g of games) {
    try {
      const resolved = resolveGame(g.name, g.slug);
      resolvedGamesMap.set(String(g.id), resolved);

      // Global games/{gameId} (Master: no pity/cost/budget fields)
      const gameMasterDoc = {
        name: resolved.name,
        aliases: resolved.aliases || [],
        franchise_id: resolved.franchise_id || null,
        color: resolved.color || "#c9a84c",
      };
      addOp("games/" + resolved.id, gameMasterDoc, "gameMaster", "set");

      // Global modules/gacha/gameConfigs/{gameId}
      const gameConfigDoc = {
        schema_version: schemaVersion,
        created_at: toTimestampObj(g.created_at, now),
        updated_at: toTimestampObj(g.created_at, now),
        game_id: resolved.id,
        developer: g.developer ?? null,
        genre: g.genre ?? null,
        soft_pity: g.soft_pity != null ? Number(g.soft_pity) : null,
        hard_pity: g.hard_pity != null ? Number(g.hard_pity) : null,
        base_cost: g.base_cost != null ? Number(g.base_cost) : 0,
        has_guarantee: Boolean(g.has_guarantee),
      };
      addOp("modules/gacha/gameConfigs/" + resolved.id, gameConfigDoc, "gameConfig", "set");

      // Global identityMappings
      const mappingId = getIdentityMappingId("gachaguard", "game", g.id, null);
      const identityDoc = {
        schema_version: schemaVersion,
        created_at: toTimestampObj(now),
        updated_at: toTimestampObj(now),
        source: "gachaguard",
        entity: "game",
        source_id: String(g.id),
        target_id: resolved.id,
        uid: null,
        verified_at: toTimestampObj(now),
      };
      addOp("identityMappings/" + mappingId, identityDoc, "identityMapping", "set");
    } catch (err) {
      errors.push("[games] Error processing game '" + (g.name || g.id) + "': " + err.message);
    }
  }
}

export function transformProfiles(profiles, resolveUser, now, addOp, schemaVersion) {
  for (const p of profiles) {
    const userMeta = resolveUser(p.id, "profiles");
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const createdAt = toTimestampObj(p.created_at, now);
    const updatedAt = toTimestampObj(p.updated_at, now);

    const userProfileDoc = {
      profile: {
        user_id: uid,
        display_name: p.display_name || "모험가",
        timezone: p.timezone || "Asia/Seoul",
        reset_day: 1,
        reset_hour: 5,
        reminders: { weekly: true, events: true, daily: false },
      },
      account: {
        email: p.email || null,
        avatar_url: null,
        providers: ["google"],
        created_at: createdAt,
        updated_at: updatedAt,
      },
    };
    addOp("users/" + uid, userProfileDoc, "userProfile", "merge");

    const preferencesDoc = {
      schema_version: schemaVersion,
      created_at: createdAt,
      updated_at: updatedAt,
      session_warning_amount:
        p.session_warning_amount != null ? Number(p.session_warning_amount) : 50000,
    };
    addOp(
      "users/" + uid + "/gacha/main/settings/preferences",
      preferencesDoc,
      "preferences",
      "set"
    );

    const mappingId = getIdentityMappingId("gachaguard", "account", p.id, uid);
    const identityDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(now),
      updated_at: toTimestampObj(now),
      source: "gachaguard",
      entity: "account",
      source_id: String(p.id),
      target_id: uid,
      uid,
      verified_at: toTimestampObj(userMeta.verified_at),
    };
    addOp("identityMappings/" + mappingId, identityDoc, "identityMapping", "set");
  }
}

export function transformBudgets(budgets, resolveUser, now, addOp, errors, warnings, schemaVersion) {
  const seenBudgets = new Set();
  for (const b of budgets) {
    const userMeta = resolveUser(b.user_id, "budgets:" + b.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const yearMonth = b.year_month;
    if (!yearMonth || !/^[0-9]{4}-[0-9]{2}$/.test(yearMonth)) {
      errors.push("[budgets:" + b.id + "] Invalid year_month format: " + yearMonth);
      continue;
    }

    const budgetKey = uid + "_" + yearMonth;
    if (seenBudgets.has(budgetKey)) {
      warnings.push("[budgets:" + b.id + "] Duplicate budget for " + budgetKey + ", skipping");
      continue;
    }
    seenBudgets.add(budgetKey);

    const budgetDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(b.created_at, now),
      updated_at: toTimestampObj(b.updated_at, now),
      year_month: yearMonth,
      total_budget: b.total_budget != null ? Number(b.total_budget) : 0,
      warning_at: b.warning_at != null ? Number(b.warning_at) : 70,
    };
    addOp("users/" + uid + "/gacha/main/budgets/" + yearMonth, budgetDoc, "budget", "set");
  }
}
