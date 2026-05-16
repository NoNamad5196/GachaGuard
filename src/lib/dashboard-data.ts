import { getMonthRange } from "@/lib/domain/calculations";
import type {
  BannerRecord,
  BudgetRecord,
  DashboardData,
  GameMaster,
  GachaLogRecord,
  GuardrailRule,
  PaymentRecord,
  ProfileRecord,
  PullRecord,
  PullSessionRecord,
  UserBanner,
  UserGame,
} from "@/lib/domain/dashboard";
import { getDemoDashboardData } from "@/lib/domain/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const GAME_SELECT =
  "id, slug, name, developer, genre, soft_pity, hard_pity, base_cost, has_guarantee";

const BANNER_SELECT = `*, games(${GAME_SELECT})`;
const USER_GAME_SELECT = `*, games(${GAME_SELECT})`;
const USER_BANNER_SELECT = `*, banners(${BANNER_SELECT}), user_games(${USER_GAME_SELECT})`;

export async function getDashboardData(): Promise<DashboardData | null> {
  const range = getMonthRange();
  const authEnabled = hasSupabaseEnv();

  if (!authEnabled) {
    return getDemoDashboardData({ authEnabled: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return getDemoDashboardData({ authEnabled: true });
  }

  const [
    profileResult,
    gamesResult,
    userGamesResult,
    budgetResult,
    paymentsResult,
    gachaLogsResult,
    bannersResult,
    userBannersResult,
    pullSessionsResult,
    pullsResult,
    guardrailRulesResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("games").select("*").order("name"),
    supabase
      .from("user_games")
      .select(USER_GAME_SELECT)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("year_month", range.yearMonth)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*, user_games(games(name, slug, base_cost, hard_pity))")
      .eq("user_id", user.id)
      .gte("paid_at", range.startIso)
      .lt("paid_at", range.endIso)
      .order("paid_at", { ascending: false }),
    supabase
      .from("gacha_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("pulled_at", { ascending: false })
      .limit(12),
    supabase
      .from("banners")
      .select(BANNER_SELECT)
      .eq("is_active", true)
      .order("ends_at", { ascending: true }),
    supabase
      .from("user_banners")
      .select(USER_BANNER_SELECT)
      .eq("user_id", user.id)
      .eq("is_tracking", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("pull_sessions")
      .select(`*, user_banners(banners(id, name, featured, games(id, name, slug, base_cost)))`)
      .eq("user_id", user.id)
      .order("pulled_at", { ascending: false })
      .limit(30),
    supabase
      .from("pulls")
      .select(
        `*, user_banners(current_pity, banners(id, name, featured, games(id, name, slug, base_cost)))`,
      )
      .eq("user_id", user.id)
      .order("pulled_at", { ascending: false })
      .limit(100),
    supabase
      .from("guardrail_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const error =
    profileResult.error ??
    gamesResult.error ??
    userGamesResult.error ??
    budgetResult.error ??
    paymentsResult.error ??
    gachaLogsResult.error ??
    bannersResult.error ??
    userBannersResult.error ??
    pullSessionsResult.error ??
    pullsResult.error ??
    guardrailRulesResult.error;

  if (error) {
    throw error;
  }

  const fallbackProfile: ProfileRecord = {
    id: user.id,
    email: user.email ?? null,
    display_name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Guard",
    timezone: "Asia/Seoul",
    session_warning_amount: 50000,
  };

  const guardrailRules = (guardrailRulesResult.data ?? []) as GuardrailRule[];

  return {
    isDemo: false,
    authEnabled: true,
    isAuthenticated: true,
    yearMonth: range.yearMonth,
    profile: (profileResult.data as ProfileRecord | null) ?? fallbackProfile,
    budget: budgetResult.data as BudgetRecord | null,
    games: (gamesResult.data ?? []) as GameMaster[],
    userGames: (userGamesResult.data ?? []) as unknown as UserGame[],
    banners: (bannersResult.data ?? []) as unknown as BannerRecord[],
    userBanners: (userBannersResult.data ?? []) as unknown as UserBanner[],
    payments: (paymentsResult.data ?? []) as unknown as PaymentRecord[],
    gachaLogs: (gachaLogsResult.data ?? []) as GachaLogRecord[],
    pullSessions: (pullSessionsResult.data ?? []) as unknown as PullSessionRecord[],
    pulls: (pullsResult.data ?? []) as unknown as PullRecord[],
    guardrailRules,
  };
}
