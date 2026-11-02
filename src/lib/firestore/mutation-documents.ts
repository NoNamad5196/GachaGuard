import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

export const timestampSchema = z.instanceof(Timestamp);

export const masterGameStoredSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  franchise_id: z.string().nullable().optional(),
  color: z.string().optional(),
});

export const gameConfigStoredSchema = z.object({
  game_id: z.string().min(1),
  developer: z.string().optional(),
  genre: z.string().optional(),
  soft_pity: z.number().int().min(0).nullable().optional(),
  hard_pity: z.number().int().positive().optional(),
  base_cost: z.number().int().nonnegative().optional(),
  has_guarantee: z.boolean().optional(),
  schema_version: z.literal(1).optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export const sharedUserGameStoredSchema = z
  .object({
    id: z.string().min(1),
    user_id: z.string().min(1),
    game_id: z.string().min(1),
    name: z.string().min(1),
    intensity: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const gameStateStoredSchema = z.object({
  user_game_id: z.string().min(1),
  game_id: z.string().min(1),
  nickname: z.string().nullable().optional(),
  current_pity: z.number().int().nonnegative().default(0),
  monthly_budget: z.number().int().nonnegative().default(0),
  warning_threshold_percent: z.number().int().min(1).max(100).default(70),
  is_active: z.boolean().default(true),
  revision: z.number().int().nonnegative().default(0),
  last_user_banner_id: z.string().nullable().optional(),
  schema_version: z.literal(1).optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export const bannerStoredSchema = z.object({
  game_id: z.string().min(1),
  name: z.string().min(1),
  banner_type: z.enum(["character", "weapon", "standard", "event"]).default("character"),
  featured: z.string().default(""),
  starts_at: timestampSchema,
  ends_at: timestampSchema,
  soft_pity: z.number().int().min(0).nullable().optional(),
  hard_pity: z.number().int().positive().default(90),
  base_rate: z.number().positive().default(0.006),
  rate_up: z.number().min(0).max(1).default(0.5),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(false),
  created_by: z.string().nullable().optional(),
  source: z.string().default("user"),
  source_url: z.string().nullable().optional(),
  schema_version: z.literal(1).optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export const userBannerStoredSchema = z.object({
  user_game_id: z.string().min(1),
  game_id: z.string().min(1),
  banner_id: z.string().min(1),
  banner_scope: z.enum(["public", "private"]),
  initial_pity: z.number().int().nonnegative().default(0),
  current_pity: z.number().int().nonnegative().default(0),
  pulls_total: z.number().int().nonnegative().default(0),
  pulls_5_star: z.number().int().nonnegative().default(0),
  is_tracking: z.boolean().default(true),
  revision: z.number().int().nonnegative().default(0),
  schema_version: z.literal(1).optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export const paymentTemplateStoredSchema = z.object({
  user_game_id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().int().positive(),
  type: z.enum(["gacha", "pass", "coin", "event", "other"]),
  day_of_month: z.number().int().min(1).max(31),
  is_active: z.boolean().default(true),
  last_applied_year_month: z.string().nullable().optional(),
  schema_version: z.literal(1).optional(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});
