import type { Timestamp } from "firebase-admin/firestore";

export interface FirestoreMeta {
  schema_version: 1;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SharedUserGame {
  id: string; // entryId
  user_id: string; // uid
  game_id: string;
  intensity: "main" | "sub" | "login-only" | "frozen" | "abandoned";
  last_access: string | null;
  display_order: number;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  // S extensions
  name: string;
  icon: string | null;
  current_goal: string | null;
  weekly_tasks: string[];
  weekly_tasks_done: boolean[];
  quests: Array<{
    id: string;
    label: string;
    current: number;
    total: number;
    type: "daily" | "weekly" | "event";
    deadline: string | null;
    done: boolean;
  }>;
  next_goal: string | null;
  urgency: "high" | "medium" | "low";
  party_memo: string | null;
  memo: string | null;
  estimated_minutes: number;
  parties: Array<{
    id: string;
    name: string;
    slots: (string | null)[];
    notes: string;
  }>;
  deleted_at?: string | null;
}

export interface GameStateDoc extends FirestoreMeta {
  user_game_id: string;
  game_id: string;
  nickname: string | null;
  current_pity: number;
  monthly_budget: number;
  warning_threshold_percent: number;
  is_active: boolean;
  revision: number;
  last_user_banner_id: string | null;
}

export interface BudgetDoc extends FirestoreMeta {
  year_month: string;
  total_budget: number;
  warning_at: number;
}

export interface PaymentDoc extends FirestoreMeta {
  user_game_id: string;
  amount: number;
  type: "gacha" | "pass" | "coin" | "event" | "other";
  paid_at: Timestamp;
  memo: string | null;
  regret_score: number | null;
  source: string;
  external_order_id: string | null;
  import_fingerprint: string | null;
  merchant: string | null;
  raw_description: string | null;
  currency: string;
  imported_at: Timestamp | null;
}

export interface PaymentTemplateDoc extends FirestoreMeta {
  user_game_id: string;
  name: string;
  amount: number;
  type: "gacha" | "pass" | "coin" | "event" | "other";
  day_of_month: number;
  is_active: boolean;
  last_applied_year_month: string | null;
}

export interface BannerDoc extends FirestoreMeta {
  game_id: string;
  name: string;
  banner_type: "character" | "weapon" | "standard" | "event";
  featured: string;
  starts_at: Timestamp;
  ends_at: Timestamp;
  soft_pity: number | null;
  hard_pity: number;
  base_rate: number;
  rate_up: number;
  is_active: boolean;
  is_public: boolean;
  created_by: string | null;
  source: string;
  source_url: string | null;
}

export interface UserBannerDoc extends FirestoreMeta {
  user_game_id: string;
  game_id: string;
  banner_id: string;
  banner_scope: "public" | "private";
  initial_pity: number;
  current_pity: number;
  pulls_total: number;
  pulls_5_star: number;
  is_tracking: boolean;
  revision: number;
}

export interface PullSessionDoc extends FirestoreMeta {
  user_banner_id: string;
  user_game_id: string;
  pulls_count: number;
  total_cost: number;
  currency: string;
  memo: string | null;
  pulled_at: Timestamp;
}

export interface PullDoc extends FirestoreMeta {
  pull_session_id: string;
  user_banner_id: string;
  user_game_id: string;
  pull_number: number;
  pity_before: number;
  rarity: number;
  item_name: string | null;
  cost: number;
  is_rate_up: boolean | null;
  pulled_at: Timestamp;
}

export interface GachaLogDoc extends FirestoreMeta {
  user_game_id: string;
  pulls: number;
  result: string | null;
  pity_at_pull: number;
  pulled_at: Timestamp;
}

export interface GuardrailRuleDoc extends FirestoreMeta {
  kind: "warning" | "hard_stop" | "cooldown" | "daily_cap";
  name: string;
  threshold_amount: number | null;
  threshold_percent: number | null;
  cooldown_days: number | null;
  enabled: boolean;
}
