import { toIsoString, toTimestampObj } from "./dates.mjs";
import { getIdentityMappingId } from "./identity.mjs";

export function transformUserGames(
  userGames,
  resolvedGamesMap,
  resolveUser,
  existingTarget,
  now,
  addOp,
  errors,
  userGameLookup,
  schemaVersion
) {
  const existingUserGames = existingTarget.userGames || new Map();

  for (const ug of userGames) {
    const userMeta = resolveUser(ug.user_id, "user_games:" + ug.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const resolvedGame = resolvedGamesMap.get(String(ug.game_id));
    if (!resolvedGame) {
      errors.push(
        "[user_games:" + ug.id + "] Referenced game_id '" + ug.game_id + "' not found in games"
      );
      continue;
    }

    const gameId = resolvedGame.id;
    const userTargetGames = existingUserGames.get(uid);
    let entryId = userTargetGames ? userTargetGames.get(gameId) : null;
    const isExistingEntry = Boolean(entryId);

    if (!entryId) {
      entryId = gameId;
    }

    userGameLookup.set(String(ug.id), {
      uid,
      entryId,
      gameId,
      supabaseRow: ug,
    });

    const createdAtIso = toIsoString(ug.created_at);
    const updatedAtIso = toIsoString(ug.updated_at);
    const createdAtTs = toTimestampObj(ug.created_at, now);
    const updatedAtTs = toTimestampObj(ug.updated_at, now);

    if (isExistingEntry) {
      const sharedMergeDoc = {
        intensity: "main",
        updated_at: updatedAtIso,
      };
      addOp("users/" + uid + "/games/" + entryId, sharedMergeDoc, "userGameShared", "merge");
    } else {
      const fullUserGameDoc = {
        id: entryId,
        user_id: uid,
        game_id: gameId,
        intensity: "main",
        last_access: null,
        display_order: 0,
        created_at: createdAtIso,
        updated_at: updatedAtIso,
        name: resolvedGame.name,
        icon: null,
        current_goal: null,
        weekly_tasks: [],
        weekly_tasks_done: [],
        quests: [],
        next_goal: null,
        urgency: "medium",
        party_memo: null,
        memo: null,
        estimated_minutes: 0,
        parties: [],
      };
      addOp("users/" + uid + "/games/" + entryId, fullUserGameDoc, "userGame", "set");
    }

    const gameStateDoc = {
      schema_version: schemaVersion,
      created_at: createdAtTs,
      updated_at: updatedAtTs,
      user_game_id: entryId,
      game_id: gameId,
      nickname: ug.nickname ?? null,
      current_pity: ug.current_pity != null ? Number(ug.current_pity) : 0,
      monthly_budget: ug.monthly_budget != null ? Number(ug.monthly_budget) : 0,
      warning_threshold_percent:
        ug.warning_threshold_percent != null ? Number(ug.warning_threshold_percent) : 70,
      is_active: ug.is_active !== undefined ? Boolean(ug.is_active) : true,
      revision: 1,
      last_user_banner_id: null,
    };
    addOp(
      "users/" + uid + "/gacha/main/gameStates/" + entryId,
      gameStateDoc,
      "gameState",
      "set"
    );

    const mappingId = getIdentityMappingId("gachaguard", "userGame", ug.id, uid);
    const identityDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(now),
      updated_at: toTimestampObj(now),
      source: "gachaguard",
      entity: "userGame",
      source_id: String(ug.id),
      target_id: entryId,
      uid,
      verified_at: toTimestampObj(userMeta.verified_at),
    };
    addOp("identityMappings/" + mappingId, identityDoc, "identityMapping", "set");
  }
}
