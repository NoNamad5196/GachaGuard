import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { z } from "zod";
import { firestoreIdSchema } from "@/lib/domain/schemas";

const nonnegative = z.number().int().nonnegative();
const timestamp = z.instanceof(Timestamp);
const metadata = { schema_version: z.literal(1), created_at: timestamp, updated_at: timestamp };
const trackingSchema = z.object({
  user_game_id: firestoreIdSchema, game_id: firestoreIdSchema, banner_id: firestoreIdSchema,
  banner_scope: z.enum(["public", "private"]), initial_pity: nonnegative, current_pity: nonnegative,
  pulls_total: nonnegative, pulls_5_star: nonnegative, revision: nonnegative, is_tracking: z.boolean(), ...metadata,
});
export const pullDocumentSchema = z.object({
  pull_session_id: firestoreIdSchema, user_banner_id: firestoreIdSchema, user_game_id: firestoreIdSchema,
  pull_number: z.number().int().positive(), pity_before: nonnegative, rarity: z.number().int().min(3).max(5),
  item_name: z.string().nullable(), cost: nonnegative, is_rate_up: z.boolean().nullable(), pulled_at: timestamp, ...metadata,
});
export const sessionDocumentSchema = z.object({
  user_banner_id: firestoreIdSchema, user_game_id: firestoreIdSchema, pulls_count: z.number().int().positive(),
  total_cost: nonnegative, currency: z.string(), memo: z.string().nullable(), pulled_at: timestamp, ...metadata,
});

export class PullHistoryError extends Error {
  constructor(readonly code: "reference" | "limit", message: string) { super(message); this.name = "PullHistoryError"; }
}

export async function readPullHistory(tx: Transaction, db: Firestore, owner: { uid: string; trackingId: string }) {
  const prefix = `users/${owner.uid}/gacha/main`;
  const trackingRef = db.doc(`${prefix}/userBanners/${owner.trackingId}`);
  const tracking = trackingSchema.parse((await tx.get(trackingRef)).data());
  const stateRef = db.doc(`${prefix}/gameStates/${tracking.user_game_id}`);
  const state = z.object({ revision: nonnegative, game_id: firestoreIdSchema }).parse((await tx.get(stateRef)).data());
  const shared = z.object({ user_id: z.literal(owner.uid), game_id: z.literal(tracking.game_id) })
    .parse((await tx.get(db.doc(`users/${owner.uid}/games/${tracking.user_game_id}`))).data());
  const bannerPath = tracking.banner_scope === "public" ? `modules/gacha/banners/${tracking.banner_id}` : `${prefix}/banners/${tracking.banner_id}`;
  z.object({ game_id: z.literal(shared.game_id), is_public: z.literal(tracking.banner_scope === "public"),
    created_by: tracking.banner_scope === "public" ? z.null() : z.literal(owner.uid) })
    .parse((await tx.get(db.doc(bannerPath))).data());
  if (state.game_id !== tracking.game_id) throw new PullHistoryError("reference", "게임 참조가 일치하지 않습니다.");
  const pulls = await tx.get(db.collection(`${prefix}/pulls`).where("user_banner_id", "==", owner.trackingId).limit(451));
  const sessions = await tx.get(db.collection(`${prefix}/pullSessions`).where("user_banner_id", "==", owner.trackingId).limit(451));
  if (pulls.size >= 451 || sessions.size >= 451) throw new PullHistoryError("limit", "이력 한도를 초과했습니다. 별도 페이지 이관이 필요합니다.");
  const pullMap = new Map(pulls.docs.map((doc) => [doc.id, pullDocumentSchema.parse(doc.data())]));
  const sessionMap = new Map(sessions.docs.map((doc) => [doc.id, sessionDocumentSchema.parse(doc.data())]));
  for (const pull of pullMap.values()) {
    if (pull.user_game_id !== tracking.user_game_id || !sessionMap.has(pull.pull_session_id)) {
      throw new PullHistoryError("reference", "뽑기 세션 참조를 확인할 수 없습니다.");
    }
  }
  for (const session of sessionMap.values()) {
    if (session.user_game_id !== tracking.user_game_id) throw new PullHistoryError("reference", "세션 소유 게임이 일치하지 않습니다.");
  }
  return { prefix, trackingId: owner.trackingId, trackingRef, tracking, stateRef, state, pullMap, sessionMap, removed: new Set<string>() };
}

export type PullHistory = Awaited<ReturnType<typeof readPullHistory>>;

export function writePullHistory(tx: Transaction, history: PullHistory) {
  const { pullMap, sessionMap, tracking, prefix } = history;
  if (pullMap.size + sessionMap.size + history.removed.size + 2 > 450) {
    throw new PullHistoryError("limit", "단일 트랜잭션 한도(450 writes)를 초과했습니다. 이력은 변경되지 않았습니다.");
  }
  const ordered = [...pullMap].sort(([, a], [, b]) => a.pulled_at.seconds - b.pulled_at.seconds
    || a.pulled_at.nanoseconds - b.pulled_at.nanoseconds
    || (a.pull_session_id < b.pull_session_id ? -1 : a.pull_session_id > b.pull_session_id ? 1 : 0)
    || a.pull_number - b.pull_number);
  const stats = new Map<string, { count: number; cost: number }>();
  let pity = tracking.initial_pity;
  let fiveStars = 0;
  const now = Timestamp.now();
  for (const [id, pull] of ordered) {
    tx.set(history.trackingRef.firestore.doc(`${prefix}/pulls/${id}`), { ...pull, pity_before: pity, updated_at: now });
    pity = pull.rarity === 5 ? 0 : pity + 1;
    if (pull.rarity === 5) fiveStars++;
    const stat = stats.get(pull.pull_session_id) ?? { count: 0, cost: 0 };
    stats.set(pull.pull_session_id, { count: stat.count + 1, cost: stat.cost + pull.cost });
  }
  for (const id of history.removed) tx.delete(history.trackingRef.firestore.doc(`${prefix}/pulls/${id}`));
  for (const [id, session] of sessionMap) {
    const ref = history.trackingRef.firestore.doc(`${prefix}/pullSessions/${id}`);
    const stat = stats.get(id);
    if (stat) tx.set(ref, { ...session, pulls_count: stat.count, total_cost: stat.cost, updated_at: now });
    else tx.delete(ref);
  }
  tx.update(history.trackingRef, { current_pity: pity, pulls_total: pullMap.size, pulls_5_star: fiveStars,
    revision: tracking.revision + 1, updated_at: now });
  tx.update(history.stateRef, { current_pity: pity, last_user_banner_id: history.trackingId,
    revision: history.state.revision + 1, updated_at: now });
}
