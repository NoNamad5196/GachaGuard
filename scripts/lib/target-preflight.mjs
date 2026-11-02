export async function discoverTargetUserGames(db, uidMap) {
  const userGamesMap = new Map();
  for (const { uid } of uidMap.values()) {
    if (userGamesMap.has(uid)) continue;
    const gameMap = new Map();
    try {
      const snap = await db.collection(`users/${uid}/games`).get();
      if (snap && snap.docs) {
        for (const doc of snap.docs) {
          const data = typeof doc.data === "function" ? doc.data() : doc.data;
          if (data && data.game_id) {
            gameMap.set(data.game_id, doc.id);
          }
        }
      }
    } catch {
      // Proceed if collection is not yet present
    }
    userGamesMap.set(uid, gameMap);
  }
  return { userGames: userGamesMap };
}

export function isSharedDoc(path, entity) {
  if (entity === "userProfile" || path.match(/^users\/[^/]+$/)) return true;
  if (entity === "userGame" || entity === "userGameShared" || path.match(/^users\/[^/]+\/games\/[^/]+$/)) return true;
  if (entity === "gameMaster" || path.match(/^games\/[^/]+$/)) return true;
  return false;
}

export function isDataIdentical(existingVal, plannedVal) {
  if (existingVal === plannedVal) return true;
  if (existingVal == null && plannedVal == null) return true;
  if (existingVal == null || plannedVal == null) return false;

  if (plannedVal._firestoreTimestamp) {
    const plannedSec = plannedVal.seconds;
    const plannedNanos = plannedVal.nanoseconds || 0;
    if (existingVal.seconds !== undefined) {
      return existingVal.seconds === plannedSec && (existingVal.nanoseconds || 0) === plannedNanos;
    }
    if (existingVal instanceof Date || typeof existingVal.toDate === "function") {
      const d = typeof existingVal.toDate === "function" ? existingVal.toDate() : existingVal;
      return Math.floor(d.getTime() / 1000) === plannedSec;
    }
    if (typeof existingVal === "string") {
      const d = new Date(existingVal);
      return Math.floor(d.getTime() / 1000) === plannedSec;
    }
    return false;
  }

  if (typeof existingVal !== typeof plannedVal) return false;

  if (Array.isArray(plannedVal)) {
    if (!Array.isArray(existingVal) || existingVal.length !== plannedVal.length) return false;
    for (let i = 0; i < plannedVal.length; i++) {
      if (!isDataIdentical(existingVal[i], plannedVal[i])) return false;
    }
    return true;
  }

  if (typeof plannedVal === "object") {
    const plannedKeys = Object.keys(plannedVal);
    for (const key of plannedKeys) {
      if (!isDataIdentical(existingVal[key], plannedVal[key])) return false;
    }
    return true;
  }

  return false;
}

export async function preflightOperations(db, operations) {
  const plan = [];

  for (const op of operations) {
    const docRef = db.doc(op.path);
    const snap = await docRef.get();
    const exists = snap && (typeof snap.exists === "function" ? snap.exists() : snap.exists);
    const existingData = exists ? (typeof snap.data === "function" ? snap.data() : snap.data) : null;

    if (!exists) {
      plan.push({ op, action: "create" });
      continue;
    }

    if (isSharedDoc(op.path, op.entity)) {
      if (op.entity === "userGame" || op.entity === "userGameShared" || op.path.includes("/games/")) {
        if (existingData?.game_id && op.data.game_id && existingData.game_id !== op.data.game_id) {
          throw new Error(
            `Target conflict at '${op.path}': Existing game entry has game_id '${existingData.game_id}', but migration expects '${op.data.game_id}'. Overwrite rejected.`
          );
        }
        plan.push({ op, action: "skip", reason: "Existing shared userGame preserved unchanged" });
        continue;
      }

      if (op.entity === "userProfile") {
        if (existingData?.profile?.user_id && op.data?.profile?.user_id && existingData.profile.user_id !== op.data.profile.user_id) {
          throw new Error(
            `Target conflict at '${op.path}': Existing profile user_id '${existingData.profile.user_id}' does not match migration uid '${op.data.profile.user_id}'. Overwrite rejected.`
          );
        }
        plan.push({ op, action: "skip", reason: "Existing shared userProfile preserved unchanged" });
        continue;
      }

      plan.push({ op, action: "skip", reason: "Existing gameMaster catalog preserved unchanged" });
      continue;
    }

    if (isDataIdentical(existingData, op.data)) {
      plan.push({ op, action: "skip", reason: "Existing document is identical" });
    } else {
      throw new Error(
        `Target conflict at '${op.path}': Nonshared document already exists with conflicting data. Create-only rule strictly prohibits overwriting existing data.`
      );
    }
  }

  return plan;
}
