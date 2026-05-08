import { getMonthRange } from "@/lib/domain/calculations";
import type {
  BudgetRecord,
  DashboardData,
  GameMaster,
  GachaLogRecord,
  PaymentRecord,
  ProfileRecord,
  UserGame,
} from "@/lib/domain/dashboard";
import { getDemoDashboardData } from "@/lib/domain/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardData(): Promise<DashboardData | null> {
  const range = getMonthRange();

  if (!hasSupabaseEnv()) {
    return getDemoDashboardData();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    profileResult,
    gamesResult,
    userGamesResult,
    budgetResult,
    paymentsResult,
    gachaLogsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("games").select("*").order("name"),
    supabase
      .from("user_games")
      .select(
        "*, games(id, slug, name, developer, genre, soft_pity, hard_pity, base_cost, has_guarantee, created_at)",
      )
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
  ]);

  if (
    profileResult.error ||
    gamesResult.error ||
    userGamesResult.error ||
    budgetResult.error ||
    paymentsResult.error ||
    gachaLogsResult.error
  ) {
    throw (
      profileResult.error ??
      gamesResult.error ??
      userGamesResult.error ??
      budgetResult.error ??
      paymentsResult.error ??
      gachaLogsResult.error
    );
  }

  const fallbackProfile: ProfileRecord = {
    id: user.id,
    email: user.email ?? null,
    display_name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Guard",
    timezone: "Asia/Seoul",
    session_warning_amount: 50000,
  };

  return {
    isDemo: false,
    yearMonth: range.yearMonth,
    profile: (profileResult.data as ProfileRecord | null) ?? fallbackProfile,
    budget: budgetResult.data as BudgetRecord | null,
    games: (gamesResult.data ?? []) as GameMaster[],
    userGames: (userGamesResult.data ?? []) as unknown as UserGame[],
    payments: (paymentsResult.data ?? []) as unknown as PaymentRecord[],
    gachaLogs: (gachaLogsResult.data ?? []) as GachaLogRecord[],
  };
}
