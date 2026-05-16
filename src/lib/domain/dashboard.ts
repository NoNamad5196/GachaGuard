import type {
  BannerType,
  GuardrailRuleKind,
  PaymentType,
} from "@/types/database";

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

export interface BannerRecord {
  id: string;
  game_id: string;
  name: string;
  banner_type: BannerType;
  featured: string;
  starts_at: string;
  ends_at: string;
  soft_pity: number | null;
  hard_pity: number;
  base_rate: number;
  rate_up: number;
  is_active: boolean;
  games: GameMaster;
}

export interface UserBanner {
  id: string;
  user_id: string;
  user_game_id: string;
  banner_id: string;
  current_pity: number;
  pulls_total: number;
  pulls_5_star: number;
  is_tracking: boolean;
  banners: BannerRecord;
  user_games?: UserGame;
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
  source: string;
  external_order_id: string | null;
  import_fingerprint: string | null;
  merchant: string | null;
  raw_description: string | null;
  currency: string;
  imported_at: string | null;
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

export interface PullSessionRecord {
  id: string;
  user_id: string;
  user_banner_id: string;
  pulls_count: number;
  total_cost: number;
  currency: string;
  memo: string | null;
  pulled_at: string;
  user_banners?: {
    banners?: Pick<BannerRecord, "id" | "name" | "featured"> & {
      games?: Pick<GameMaster, "id" | "name" | "slug" | "base_cost">;
    };
  };
}

export interface PullRecord {
  id: string;
  user_id: string;
  pull_session_id: string;
  user_banner_id: string;
  pull_number: number;
  pity_before: number;
  rarity: number;
  item_name: string | null;
  cost: number;
  is_rate_up: boolean | null;
  pulled_at: string;
  user_banners?: {
    current_pity?: number;
    banners?: Pick<BannerRecord, "id" | "name" | "featured"> & {
      games?: Pick<GameMaster, "id" | "name" | "slug" | "base_cost">;
    };
  };
}

export interface GuardrailRule {
  id: string;
  user_id: string;
  kind: GuardrailRuleKind;
  name: string;
  threshold_amount: number | null;
  threshold_percent: number | null;
  cooldown_days: number | null;
  enabled: boolean;
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
  authEnabled: boolean;
  isAuthenticated: boolean;
  yearMonth: string;
  profile: ProfileRecord;
  budget: BudgetRecord | null;
  games: GameMaster[];
  userGames: UserGame[];
  banners: BannerRecord[];
  userBanners: UserBanner[];
  payments: PaymentRecord[];
  gachaLogs: GachaLogRecord[];
  pullSessions: PullSessionRecord[];
  pulls: PullRecord[];
  guardrailRules: GuardrailRule[];
}
