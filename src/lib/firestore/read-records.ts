import type {
  PaymentRecord,
  ProfileRecord,
  PullRecord,
  PullSessionRecord,
  UserBanner,
  UserGame,
} from "@/lib/domain/dashboard";
import type {
  PaymentDoc,
  PreferencesDoc,
  PullDoc,
  PullSessionDoc,
  UserDoc,
} from "./read-schemas";

export function projectProfile(
  uid: string,
  sessionUser: { uid: string; email: string | null; name: string | null },
  userDocData?: UserDoc | null,
  prefData?: PreferencesDoc | null,
): ProfileRecord {
  const email = userDocData?.account?.email ?? sessionUser.email ?? null;
  const displayName =
    userDocData?.profile?.display_name ??
    sessionUser.name ??
    email?.split("@")[0] ??
    "Guard";
  return {
    id: uid,
    email,
    display_name: displayName,
    timezone: userDocData?.profile?.timezone ?? "Asia/Seoul",
    session_warning_amount: prefData?.session_warning_amount ?? 50000,
  };
}

export function projectPayments(
  uid: string,
  paymentList: Array<{ id: string; data: PaymentDoc }>,
  userGamesMap: Map<string, UserGame>,
): PaymentRecord[] {
  return paymentList.map(({ id, data }) => {
    const ug = userGamesMap.get(data.user_game_id);
    return {
      id,
      user_id: uid,
      user_game_id: data.user_game_id,
      amount: data.amount,
      type: data.type,
      paid_at: data.paid_at,
      memo: data.memo,
      regret_score: data.regret_score,
      source: data.source,
      external_order_id: data.external_order_id,
      import_fingerprint: data.import_fingerprint,
      merchant: data.merchant,
      raw_description: data.raw_description,
      currency: data.currency,
      imported_at: data.imported_at,
      user_games: ug
        ? {
            games: {
              name: ug.games.name,
              slug: ug.games.slug,
              base_cost: ug.games.base_cost,
              hard_pity: ug.games.hard_pity,
            },
          }
        : undefined,
    };
  });
}

export function projectPullSessions(
  uid: string,
  sessionList: Array<{ id: string; data: PullSessionDoc }>,
  userBannersMap: Map<string, UserBanner>,
): PullSessionRecord[] {
  return sessionList.map(({ id, data }) => {
    const ub = userBannersMap.get(data.user_banner_id);
    return {
      id,
      user_id: uid,
      user_banner_id: data.user_banner_id,
      pulls_count: data.pulls_count,
      total_cost: data.total_cost,
      currency: data.currency,
      memo: data.memo,
      pulled_at: data.pulled_at,
      user_banners: ub
        ? {
            banners: {
              id: ub.banners.id,
              name: ub.banners.name,
              featured: ub.banners.featured,
              games: {
                id: ub.banners.games.id,
                name: ub.banners.games.name,
                slug: ub.banners.games.slug,
                base_cost: ub.banners.games.base_cost,
              },
            },
          }
        : undefined,
    };
  });
}

export function projectPulls(
  uid: string,
  pullList: Array<{ id: string; data: PullDoc }>,
  userBannersMap: Map<string, UserBanner>,
): PullRecord[] {
  return pullList.map(({ id, data }) => {
    const ub = userBannersMap.get(data.user_banner_id);
    return {
      id,
      user_id: uid,
      pull_session_id: data.pull_session_id,
      user_banner_id: data.user_banner_id,
      pull_number: data.pull_number,
      pity_before: data.pity_before,
      rarity: data.rarity,
      item_name: data.item_name,
      cost: data.cost,
      is_rate_up: data.is_rate_up,
      pulled_at: data.pulled_at,
      user_banners: ub
        ? {
            current_pity: ub.current_pity,
            banners: {
              id: ub.banners.id,
              name: ub.banners.name,
              featured: ub.banners.featured,
              games: {
                id: ub.banners.games.id,
                name: ub.banners.games.name,
                slug: ub.banners.games.slug,
                base_cost: ub.banners.games.base_cost,
              },
            },
          }
        : undefined,
    };
  });
}
