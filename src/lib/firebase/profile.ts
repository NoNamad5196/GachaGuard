import type { DecodedIdToken } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export async function initializeUserProfile(identity: DecodedIdToken) {
  const db = getAdminDb();
  const userRef = db.doc(`users/${identity.uid}`);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(userRef);
    const now = Timestamp.now();
    const name = typeof identity.name === "string" ? identity.name.trim().slice(0, 40) : "Guard";
    const profile = existing.get("profile") ? {} : {
      profile: {
        user_id: identity.uid, display_name: name || "Guard", timezone: "Asia/Seoul",
        reset_day: 1, reset_hour: 4, reminders: { weekly: true, events: true, daily: true },
      },
    };
    transaction.set(userRef, {
      ...profile,
      account: {
        email: identity.email ?? null,
        avatar_url: typeof identity.picture === "string" ? identity.picture : null,
        providers: [identity.firebase.sign_in_provider],
        created_at: existing.get("account.created_at") ?? now,
        updated_at: now,
      },
    }, { merge: true });
  });
}
