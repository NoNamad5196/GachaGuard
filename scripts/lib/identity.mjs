import crypto from "node:crypto";
import { toIsoString } from "./dates.mjs";

export function sha256(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

export function getIdentityMappingId(source, entity, sourceId, uid = null) {
  return sha256(JSON.stringify([source, entity, String(sourceId), uid ? String(uid) : null]));
}

export function getPaymentId(paymentRow) {
  if (paymentRow.import_fingerprint) {
    return "import-" + sha256(paymentRow.import_fingerprint);
  }
  if (paymentRow.external_order_id && paymentRow.external_order_id.startsWith("template-")) {
    return paymentRow.external_order_id;
  }
  return String(paymentRow.id);
}

export function getTrackingId(bannerScope, bannerId) {
  return bannerScope + "-" + bannerId;
}

export function getPullId(sessionId, pullNumber) {
  return sessionId + "-" + pullNumber;
}

export function getDeterministicBannerId(gameId, name, endsAt) {
  const isoUtc = new Date(endsAt).toISOString();
  return sha256(JSON.stringify([gameId, name, isoUtc]));
}

export function normalizeUidMapping(rawMapping) {
  if (!rawMapping || typeof rawMapping !== "object") {
    throw new Error("UID mapping must be a non-null object or array");
  }

  const mapping = new Map();

  if (Array.isArray(rawMapping)) {
    for (const item of rawMapping) {
      if (!item || typeof item !== "object") continue;
      const sourceId = item.source_user_id || item.source_id || item.supabase_id;
      const targetUid = item.firebase_uid || item.target_id || item.uid;
      const verifiedAt = item.verified_at || new Date().toISOString();
      if (!sourceId || !targetUid) {
        throw new Error(
          "Invalid mapping item: source_id and target_uid are required: " + JSON.stringify(item)
        );
      }
      mapping.set(String(sourceId), {
        uid: String(targetUid).trim(),
        verified_at: toIsoString(verifiedAt),
      });
    }
  } else {
    for (const [sourceId, value] of Object.entries(rawMapping)) {
      if (typeof value === "string") {
        mapping.set(String(sourceId), {
          uid: value.trim(),
          verified_at: new Date().toISOString(),
        });
      } else if (value && typeof value === "object") {
        const targetUid = value.uid || value.firebase_uid || value.target_id;
        if (!targetUid) {
          throw new Error("UID mapping entry for " + sourceId + " missing target uid");
        }
        mapping.set(String(sourceId), {
          uid: String(targetUid).trim(),
          verified_at: toIsoString(value.verified_at),
        });
      }
    }
  }

  if (mapping.size === 0) {
    throw new Error("UID mapping file contains no valid mappings");
  }

  return mapping;
}
