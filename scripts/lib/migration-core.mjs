import { normalizeUidMapping } from "./identity.mjs";
import { transformGames, transformProfiles, transformBudgets } from "./transform-catalog-profile.mjs";
import { transformUserGames } from "./transform-user-games.mjs";
import { transformBanners, transformUserBanners } from "./transform-banners.mjs";
import { transformPullSessions, transformPulls, transformPayments, transformLogsAndRules } from "./transform-activity-entities.mjs";

export const SCHEMA_VERSION = 1;
export { GAME_CATALOG, normalizeGameName, resolveGame } from "./catalog.mjs";
export { parseDate, toIsoString, toTimestampObj, convertToFirestoreValue } from "./dates.mjs";
export {
  sha256,
  getIdentityMappingId,
  getPaymentId,
  getTrackingId,
  getPullId,
  getDeterministicBannerId,
  normalizeUidMapping,
} from "./identity.mjs";
export { deriveInitialPity } from "./pity.mjs";

export function transformSupabaseData(sourceData, options = {}) {
  const {
    uidMapping: rawUidMapping,
    existingTarget = {},
    now = new Date(),
  } = options;

  const uidMap = rawUidMapping instanceof Map
    ? rawUidMapping
    : normalizeUidMapping(rawUidMapping);

  const errors = [];
  const warnings = [];

  const profiles = sourceData.profiles || [];
  const games = sourceData.games || [];
  const userGames = sourceData.user_games || [];
  const budgets = sourceData.budgets || [];
  const payments = sourceData.payments || [];
  const paymentTemplates = sourceData.payment_templates || [];
  const banners = sourceData.banners || [];
  const userBanners = sourceData.user_banners || [];
  const pullSessions = sourceData.pull_sessions || [];
  const pulls = sourceData.pulls || [];
  const gachaLogs = sourceData.gacha_logs || [];
  const guardrailRules = sourceData.guardrail_rules || [];

  const resolvedGamesMap = new Map();
  const userGameLookup = new Map();
  const bannerLookup = new Map();
  const userBannerLookup = new Map();
  const pullSessionLookup = new Map();

  const operations = [];

  function addOp(path, data, entity, opType = "set") {
    operations.push({ path, data, entity, op: opType });
  }

  function resolveUser(supabaseUserId, context) {
    if (!supabaseUserId) {
      errors.push("[" + context + "] Missing user_id");
      return null;
    }
    const mapping = uidMap.get(String(supabaseUserId));
    if (!mapping) {
      errors.push(
        "[" + context + "] Unverified user mapping for Supabase user_id '" + supabaseUserId + "'. Email heuristics are strictly prohibited by OtakuS contract."
      );
      return null;
    }
    return mapping;
  }

  const pullsByUb = new Map();
  for (const p of pulls) {
    if (p.user_banner_id) {
      const ubId = String(p.user_banner_id);
      if (!pullsByUb.has(ubId)) pullsByUb.set(ubId, []);
      pullsByUb.get(ubId).push(p);
    }
  }

  // 1. Games, Profiles, Budgets
  transformGames(games, resolvedGamesMap, now, addOp, errors, SCHEMA_VERSION);
  transformProfiles(profiles, resolveUser, now, addOp, SCHEMA_VERSION);
  transformBudgets(budgets, resolveUser, now, addOp, errors, warnings, SCHEMA_VERSION);

  // 2. UserGames, Banners, UserBanners
  transformUserGames(userGames, resolvedGamesMap, resolveUser, existingTarget, now, addOp, errors, userGameLookup, SCHEMA_VERSION);
  transformBanners(banners, resolvedGamesMap, resolveUser, now, addOp, errors, bannerLookup, SCHEMA_VERSION);
  transformUserBanners(userBanners, userGameLookup, bannerLookup, pullsByUb, resolveUser, now, addOp, errors, warnings, userBannerLookup, SCHEMA_VERSION);

  // 3. Activity Entities
  transformPullSessions(pullSessions, userBannerLookup, resolveUser, now, addOp, errors, pullSessionLookup, SCHEMA_VERSION);
  transformPulls(pulls, pullSessionLookup, resolveUser, now, addOp, errors, SCHEMA_VERSION);
  transformPayments(payments, paymentTemplates, userGameLookup, resolveUser, now, addOp, errors, warnings, SCHEMA_VERSION);
  transformLogsAndRules(gachaLogs, guardrailRules, userGameLookup, resolveUser, now, addOp, errors, SCHEMA_VERSION);

  const entityCounts = {};
  for (const op of operations) {
    entityCounts[op.entity] = (entityCounts[op.entity] || 0) + 1;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    operations,
    stats: {
      totalOperations: operations.length,
      entityCounts,
      inputCounts: {
        profiles: profiles.length,
        games: games.length,
        user_games: userGames.length,
        budgets: budgets.length,
        payments: payments.length,
        payment_templates: paymentTemplates.length,
        banners: banners.length,
        user_banners: userBanners.length,
        pull_sessions: pullSessions.length,
        pulls: pulls.length,
        gacha_logs: gachaLogs.length,
        guardrail_rules: guardrailRules.length,
      },
      mappedUsers: uidMap.size,
      mappedGames: resolvedGamesMap.size,
    },
  };
}
