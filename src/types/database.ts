export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentType = "gacha" | "pass" | "coin" | "event" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          timezone: string;
          session_warning_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          timezone?: string;
          session_warning_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      games: {
        Row: {
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
        };
        Insert: Partial<Database["public"]["Tables"]["games"]["Row"]> & {
          slug: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
        Relationships: [];
      };
      user_games: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          nickname: string | null;
          current_pity: number;
          monthly_budget: number;
          warning_threshold_percent: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
        };
        Update: Partial<Database["public"]["Tables"]["user_games"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_games_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          total_budget: number;
          warning_at: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          total_budget?: number;
          warning_at?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          user_game_id: string;
          amount: number;
          type: PaymentType;
          paid_at: string;
          memo: string | null;
          regret_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_game_id: string;
          amount: number;
          type: PaymentType;
          paid_at?: string;
          memo?: string | null;
          regret_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ];
      };
      gacha_logs: {
        Row: {
          id: string;
          user_id: string;
          user_game_id: string;
          pulls: number;
          result: string | null;
          pity_at_pull: number;
          pulled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_game_id: string;
          pulls: number;
          result?: string | null;
          pity_at_pull: number;
          pulled_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gacha_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "gacha_logs_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_templates: {
        Row: {
          id: string;
          user_id: string;
          user_game_id: string;
          name: string;
          amount: number;
          type: PaymentType;
          day_of_month: number;
          is_active: boolean;
          last_applied_year_month: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
        };
        Update: Partial<Database["public"]["Tables"]["payment_templates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payment_templates_user_game_id_fkey";
            columns: ["user_game_id"];
            isOneToOne: false;
            referencedRelation: "user_games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      payment_type: PaymentType;
    };
    CompositeTypes: Record<string, never>;
  };
}
