export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentType = "gacha" | "pass" | "coin" | "event" | "other";
export type BannerType = "character" | "weapon" | "standard" | "event";
export type GuardrailRuleKind =
  | "warning"
  | "hard_stop"
  | "cooldown"
  | "daily_cap";

type TableShape<Row, Insert, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Relationships;
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<
        {
          id: string;
          email: string | null;
          display_name: string | null;
          timezone: string;
          session_warning_amount: number;
        } & Timestamped,
        {
          id: string;
          email?: string | null;
          display_name?: string | null;
          timezone?: string;
          session_warning_amount?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      games: TableShape<
        {
          id: string;
          slug: string;
          name: string;
          developer: string | null;
          genre: string | null;
          soft_pity: number | null;
          hard_pity: number | null;
          base_cost: number;
          has_guarantee: boolean;
          created_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          developer?: string | null;
          genre?: string | null;
          soft_pity?: number | null;
          hard_pity?: number | null;
          base_cost?: number;
          has_guarantee?: boolean;
          created_at?: string;
        }
      >;
      user_games: TableShape<
        {
          id: string;
          user_id: string;
          game_id: string;
          nickname: string | null;
          current_pity: number;
          monthly_budget: number;
          warning_threshold_percent: number;
          is_active: boolean;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          game_id: string;
          nickname?: string | null;
          current_pity?: number;
          monthly_budget?: number;
          warning_threshold_percent?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "user_games_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ]
      >;
      budgets: TableShape<
        {
          id: string;
          user_id: string;
          year_month: string;
          total_budget: number;
          warning_at: number;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          year_month: string;
          total_budget?: number;
          warning_at?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      payments: TableShape<
        {
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
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          user_game_id: string;
          amount: number;
          type: PaymentType;
          paid_at?: string;
          memo?: string | null;
          regret_score?: number | null;
          source?: string;
          external_order_id?: string | null;
          import_fingerprint?: string | null;
          merchant?: string | null;
          raw_description?: string | null;
          currency?: string;
          imported_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "payments_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ]
      >;
      gacha_logs: TableShape<
        {
          id: string;
          user_id: string;
          user_game_id: string;
          pulls: number;
          result: string | null;
          pity_at_pull: number;
          pulled_at: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          user_game_id: string;
          pulls: number;
          result?: string | null;
          pity_at_pull: number;
          pulled_at?: string;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "gacha_logs_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ]
      >;
      payment_templates: TableShape<
        {
          id: string;
          user_id: string;
          user_game_id: string;
          name: string;
          amount: number;
          type: PaymentType;
          day_of_month: number;
          is_active: boolean;
          last_applied_year_month: string | null;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          user_game_id: string;
          name: string;
          amount: number;
          type?: PaymentType;
          day_of_month?: number;
          is_active?: boolean;
          last_applied_year_month?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "payment_templates_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ]
      >;
      banners: TableShape<
        {
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
        } & Timestamped,
        {
          id?: string;
          game_id: string;
          name: string;
          banner_type?: BannerType;
          featured: string;
          starts_at?: string;
          ends_at: string;
          soft_pity?: number | null;
          hard_pity: number;
          base_rate?: number;
          rate_up?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "banners_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ]
      >;
      user_banners: TableShape<
        {
          id: string;
          user_id: string;
          user_game_id: string;
          banner_id: string;
          current_pity: number;
          pulls_total: number;
          pulls_5_star: number;
          is_tracking: boolean;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          user_game_id: string;
          banner_id: string;
          current_pity?: number;
          pulls_total?: number;
          pulls_5_star?: number;
          is_tracking?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        [
          {
            foreignKeyName: "user_banners_banner_id_fkey";
            columns: ["banner_id"];
            isOneToOne: false;
            referencedRelation: "banners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_banners_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ]
      >;
      pull_sessions: TableShape<
        {
          id: string;
          user_id: string;
          user_banner_id: string;
          pulls_count: number;
          total_cost: number;
          currency: string;
          memo: string | null;
          pulled_at: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          user_banner_id: string;
          pulls_count: number;
          total_cost?: number;
          currency?: string;
          memo?: string | null;
          pulled_at?: string;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "pull_sessions_user_banner_id_fkey";
            columns: ["user_banner_id"];
            isOneToOne: false;
            referencedRelation: "user_banners";
            referencedColumns: ["id"];
          },
        ]
      >;
      pulls: TableShape<
        {
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
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          pull_session_id: string;
          user_banner_id: string;
          pull_number: number;
          pity_before: number;
          rarity: number;
          item_name?: string | null;
          cost?: number;
          is_rate_up?: boolean | null;
          pulled_at?: string;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "pulls_pull_session_id_fkey";
            columns: ["pull_session_id"];
            isOneToOne: false;
            referencedRelation: "pull_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pulls_user_banner_id_fkey";
            columns: ["user_banner_id"];
            isOneToOne: false;
            referencedRelation: "user_banners";
            referencedColumns: ["id"];
          },
        ]
      >;
      guardrail_rules: TableShape<
        {
          id: string;
          user_id: string;
          kind: GuardrailRuleKind;
          name: string;
          threshold_amount: number | null;
          threshold_percent: number | null;
          cooldown_days: number | null;
          enabled: boolean;
        } & Timestamped,
        {
          id?: string;
          user_id: string;
          kind: GuardrailRuleKind;
          name: string;
          threshold_amount?: number | null;
          threshold_percent?: number | null;
          cooldown_days?: number | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      payment_type: PaymentType;
      banner_type: BannerType;
      guardrail_rule_kind: GuardrailRuleKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
