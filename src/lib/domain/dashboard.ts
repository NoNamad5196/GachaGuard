import type { PaymentType } from "@/types/database";

export interface GameMaster {
  id: string;
  slug: string;
  name: string;
  developer: string | null;
  genre: string | null;
  soft_pity: number | null;
  hard_pity: number | null;
  base_cost: number;
  has_guarantee: boolean;
}

export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  nickname: string | null;
  current_pity: number;
  monthly_budget: number;
  warning_threshold_percent: number;
  is_active: boolean;
  games: GameMaster;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_game_id: string;
  amount: number;
  type: PaymentType;
  paid_at: string;
  memo: string | null;
  regret_score: number | null;
  user_games?: {
    games?: Pick<GameMaster, "name" | "slug" | "base_cost" | "hard_pity">;
  };
}

export interface GachaLogRecord {
  id: string;
  user_game_id: string;
  pulls: number;
  result: string | null;
  pity_at_pull: number;
  pulled_at: string;
}

export interface BudgetRecord {
  id: string;
  year_month: string;
  total_budget: number;
  warning_at: number;
}

export interface ProfileRecord {
  id: string;
  email: string | null;
  display_name: string | null;
  timezone: string;
  session_warning_amount: number;
}

export interface DashboardData {
  isDemo: boolean;
  yearMonth: string;
  profile: ProfileRecord;
  budget: BudgetRecord | null;
  games: GameMaster[];
  userGames: UserGame[];
  payments: PaymentRecord[];
  gachaLogs: GachaLogRecord[];
}
