import { toTimestampObj } from "./dates.mjs";
import { getPaymentId, getPullId } from "./identity.mjs";

export function transformPullSessions(pullSessions, userBannerLookup, resolveUser, now, addOp, errors, pullSessionLookup, schemaVersion) {
  for (const ps of pullSessions) {
    const userMeta = resolveUser(ps.user_id, "pull_sessions:" + ps.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const userBanner = userBannerLookup.get(String(ps.user_banner_id));
    if (!userBanner) {
      errors.push(
        "[pull_sessions:" + ps.id + "] Referenced user_banner_id '" + ps.user_banner_id + "' not found"
      );
      continue;
    }

    const sessionId = String(ps.id);
    pullSessionLookup.set(String(ps.id), {
      sessionId,
      uid,
      trackingId: userBanner.trackingId,
      entryId: userBanner.entryId,
    });

    const sessionDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(ps.created_at, now),
      updated_at: toTimestampObj(ps.created_at, now),
      user_banner_id: userBanner.trackingId,
      user_game_id: userBanner.entryId,
      pulls_count: Number(ps.pulls_count),
      total_cost: ps.total_cost != null ? Number(ps.total_cost) : 0,
      currency: ps.currency || "KRW",
      memo: ps.memo ?? null,
      pulled_at: toTimestampObj(ps.pulled_at, now),
    };

    addOp("users/" + uid + "/gacha/main/pullSessions/" + sessionId, sessionDoc, "pullSession", "set");
  }
}

export function transformPulls(pulls, pullSessionLookup, resolveUser, now, addOp, errors, schemaVersion) {
  const seenPulls = new Set();
  for (const pull of pulls) {
    const userMeta = resolveUser(pull.user_id, "pulls:" + pull.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const session = pullSessionLookup.get(String(pull.pull_session_id));
    if (!session) {
      errors.push(
        "[pulls:" + pull.id + "] Referenced pull_session_id '" + pull.pull_session_id + "' not found"
      );
      continue;
    }

    const pullNumber = Number(pull.pull_number);
    const pullId = getPullId(session.sessionId, pullNumber);

    if (seenPulls.has(pullId)) {
      errors.push("[pulls:" + pull.id + "] Collision detected on pullId '" + pullId + "'");
      continue;
    }
    seenPulls.add(pullId);

    const pullDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(pull.created_at, now),
      updated_at: toTimestampObj(pull.created_at, now),
      pull_session_id: session.sessionId,
      user_banner_id: session.trackingId,
      user_game_id: session.entryId,
      pull_number: pullNumber,
      pity_before: Number(pull.pity_before),
      rarity: Number(pull.rarity),
      item_name: pull.item_name ?? null,
      cost: pull.cost != null ? Number(pull.cost) : 0,
      is_rate_up: pull.is_rate_up !== undefined && pull.is_rate_up !== null ? Boolean(pull.is_rate_up) : null,
      pulled_at: toTimestampObj(pull.pulled_at, now),
    };

    addOp("users/" + uid + "/gacha/main/pulls/" + pullId, pullDoc, "pull", "set");
  }
}

export function transformPayments(payments, paymentTemplates, userGameLookup, resolveUser, now, addOp, errors, warnings, schemaVersion) {
  const seenPayments = new Set();
  for (const pay of payments) {
    const userMeta = resolveUser(pay.user_id, "payments:" + pay.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const userGame = userGameLookup.get(String(pay.user_game_id));
    if (!userGame) {
      errors.push(
        "[payments:" + pay.id + "] Referenced user_game_id '" + pay.user_game_id + "' not found"
      );
      continue;
    }

    const paymentId = getPaymentId(pay);
    const paymentPath = "users/" + uid + "/gacha/main/payments/" + paymentId;

    if (seenPayments.has(paymentPath)) {
      warnings.push("[payments:" + pay.id + "] Duplicate paymentId detected: '" + paymentId + "'");
      continue;
    }
    seenPayments.add(paymentPath);

    const paymentDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(pay.created_at, now),
      updated_at: toTimestampObj(pay.updated_at, now),
      user_game_id: userGame.entryId,
      amount: Number(pay.amount),
      type: pay.type || "gacha",
      paid_at: toTimestampObj(pay.paid_at, now),
      memo: pay.memo ?? null,
      regret_score: pay.regret_score != null ? Number(pay.regret_score) : null,
      source: pay.source || "manual",
      external_order_id: pay.external_order_id ?? null,
      import_fingerprint: pay.import_fingerprint ?? null,
      merchant: pay.merchant ?? null,
      raw_description: pay.raw_description ?? null,
      currency: (pay.currency || "KRW").toUpperCase(),
      imported_at: pay.imported_at ? toTimestampObj(pay.imported_at, now) : null,
    };

    addOp(paymentPath, paymentDoc, "payment", "set");
  }

  for (const pt of paymentTemplates) {
    const userMeta = resolveUser(pt.user_id, "payment_templates:" + pt.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const userGame = userGameLookup.get(String(pt.user_game_id));
    if (!userGame) {
      errors.push(
        "[payment_templates:" + pt.id + "] Referenced user_game_id '" + pt.user_game_id + "' not found"
      );
      continue;
    }

    const templateId = String(pt.id);
    const templateDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(pt.created_at, now),
      updated_at: toTimestampObj(pt.updated_at, now),
      user_game_id: userGame.entryId,
      name: pt.name,
      amount: Number(pt.amount),
      type: pt.type || "pass",
      day_of_month: Number(pt.day_of_month),
      is_active: pt.is_active !== undefined ? Boolean(pt.is_active) : true,
      last_applied_year_month: pt.last_applied_year_month ?? null,
    };

    addOp("users/" + uid + "/gacha/main/paymentTemplates/" + templateId, templateDoc, "paymentTemplate", "set");
  }
}

export function transformLogsAndRules(gachaLogs, guardrailRules, userGameLookup, resolveUser, now, addOp, errors, schemaVersion) {
  for (const gl of gachaLogs) {
    const userMeta = resolveUser(gl.user_id, "gacha_logs:" + gl.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const userGame = userGameLookup.get(String(gl.user_game_id));
    if (!userGame) {
      errors.push(
        "[gacha_logs:" + gl.id + "] Referenced user_game_id '" + gl.user_game_id + "' not found"
      );
      continue;
    }

    const logId = String(gl.id);
    const logDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(gl.created_at, now),
      updated_at: toTimestampObj(gl.created_at, now),
      user_game_id: userGame.entryId,
      pulls: Number(gl.pulls),
      result: gl.result ?? null,
      pity_at_pull: Number(gl.pity_at_pull || 0),
      pulled_at: toTimestampObj(gl.pulled_at, now),
    };

    addOp("users/" + uid + "/gacha/main/gachaLogs/" + logId, logDoc, "gachaLog", "set");
  }

  for (const gr of guardrailRules) {
    const userMeta = resolveUser(gr.user_id, "guardrail_rules:" + gr.id);
    if (!userMeta) continue;

    const uid = userMeta.uid;
    const ruleId = String(gr.id);
    const ruleDoc = {
      schema_version: schemaVersion,
      created_at: toTimestampObj(gr.created_at, now),
      updated_at: toTimestampObj(gr.created_at, now),
      kind: gr.kind || "warning",
      name: gr.name,
      threshold_amount: gr.threshold_amount != null ? Number(gr.threshold_amount) : null,
      threshold_percent: gr.threshold_percent != null ? Number(gr.threshold_percent) : null,
      cooldown_days: gr.cooldown_days != null ? Number(gr.cooldown_days) : null,
      enabled: gr.enabled !== undefined ? Boolean(gr.enabled) : true,
    };

    addOp("users/" + uid + "/gacha/main/guardrailRules/" + ruleId, ruleDoc, "guardrailRule", "set");
  }
}
