import { z } from "zod";

export const timestampToIso = z.custom<unknown>().transform((val, ctx) => {
  if (val && typeof val === "object" && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected Firestore Timestamp or Date" });
  return z.NEVER;
});

export const optionalTimestampToIso = z.custom<unknown>().transform((val, ctx) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "object" && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected Firestore Timestamp or Date" });
  return z.NEVER;
});

export const userDocSchema = z.object({
  profile: z.object({
    user_id: z.string().optional(),
    display_name: z.string().optional(),
    timezone: z.string().default("Asia/Seoul"),
    reset_day: z.number().int().optional(),
    reset_hour: z.number().int().optional(),
  }).optional(),
  account: z.object({
    email: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
  }).optional(),
}).passthrough();

export const preferencesDocSchema = z.object({
  session_warning_amount: z.coerce.number().int().min(0).default(50000),
}).passthrough();

export const gameDocSchema = z.object({
  name: z.string().default(""),
  aliases: z.array(z.string()).default([]),
  color: z.string().optional(),
}).passthrough();

export const gameConfigDocSchema = z.object({
  game_id: z.string().optional(),
  developer: z.string().nullable().default(null),
  genre: z.string().nullable().default(null),
  soft_pity: z.coerce.number().int().nullable().default(null),
  hard_pity: z.coerce.number().int().nullable().default(90),
  base_cost: z.coerce.number().int().min(0).default(0),
  has_guarantee: z.boolean().default(false),
}).passthrough();

export const sharedUserGameDocSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  game_id: z.string(),
  name: z.string().optional(),
  display_order: z.coerce.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
}).passthrough();

export const gameStateDocSchema = z.object({
  user_game_id: z.string().optional(),
  game_id: z.string().optional(),
  nickname: z.string().nullable().default(null),
  current_pity: z.coerce.number().int().min(0).default(0),
  monthly_budget: z.coerce.number().int().min(0).default(0),
  warning_threshold_percent: z.coerce.number().int().min(1).max(100).default(70),
  is_active: z.boolean().default(true),
  revision: z.coerce.number().int().default(0),
  last_user_banner_id: z.string().nullable().default(null),
}).passthrough();

export const budgetDocSchema = z.object({
  year_month: z.string(),
  total_budget: z.coerce.number().int().min(0).default(0),
  warning_at: z.coerce.number().int().min(1).max(100).default(70),
}).passthrough();

export const paymentDocSchema = z.object({
  user_game_id: z.string(),
  amount: z.coerce.number().int(),
  type: z.enum(["gacha", "pass", "coin", "event", "other"]),
  paid_at: timestampToIso,
  memo: z.string().nullable().default(null),
  regret_score: z.coerce.number().int().nullable().default(null),
  source: z.string().default("manual"),
  external_order_id: z.string().nullable().default(null),
  import_fingerprint: z.string().nullable().default(null),
  merchant: z.string().nullable().default(null),
  raw_description: z.string().nullable().default(null),
  currency: z.string().default("KRW"),
  imported_at: optionalTimestampToIso.default(null),
}).passthrough();

export const bannerDocSchema = z.object({
  game_id: z.string(),
  name: z.string(),
  banner_type: z.enum(["character", "weapon", "standard", "event"]).default("character"),
  featured: z.string().default(""),
  starts_at: timestampToIso,
  ends_at: timestampToIso,
  soft_pity: z.coerce.number().int().nullable().default(null),
  hard_pity: z.coerce.number().int().default(90),
  base_rate: z.coerce.number().default(0.006),
  rate_up: z.coerce.number().default(0.5),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(true),
  created_by: z.string().nullable().default(null),
  source: z.string().default("official"),
  source_url: z.string().nullable().default(null),
}).passthrough();

export const userBannerDocSchema = z.object({
  user_game_id: z.string(),
  game_id: z.string(),
  banner_id: z.string(),
  banner_scope: z.enum(["public", "private"]).default("public"),
  initial_pity: z.coerce.number().int().default(0),
  current_pity: z.coerce.number().int().default(0),
  pulls_total: z.coerce.number().int().default(0),
  pulls_5_star: z.coerce.number().int().default(0),
  is_tracking: z.boolean().default(true),
  revision: z.coerce.number().int().default(0),
  updated_at: optionalTimestampToIso.default(null),
}).passthrough();

export const pullSessionDocSchema = z.object({
  user_banner_id: z.string(),
  user_game_id: z.string(),
  pulls_count: z.coerce.number().int().min(1),
  total_cost: z.coerce.number().int().min(0),
  currency: z.string().default("KRW"),
  memo: z.string().nullable().default(null),
  pulled_at: timestampToIso,
}).passthrough();

export const pullDocSchema = z.object({
  pull_session_id: z.string(),
  user_banner_id: z.string(),
  user_game_id: z.string(),
  pull_number: z.coerce.number().int().positive(),
  pity_before: z.coerce.number().int().min(0).default(0),
  rarity: z.coerce.number().int().min(3).max(5).default(3),
  item_name: z.string().nullable().default(null),
  cost: z.coerce.number().int().min(0).default(0),
  is_rate_up: z.boolean().nullable().default(null),
  pulled_at: timestampToIso,
}).passthrough();

export const gachaLogDocSchema = z.object({
  user_game_id: z.string(),
  pulls: z.coerce.number().int().positive(),
  result: z.string().nullable().default(null),
  pity_at_pull: z.coerce.number().int().min(0).default(0),
  pulled_at: timestampToIso,
}).passthrough();

export const guardrailRuleDocSchema = z.object({
  kind: z.enum(["warning", "hard_stop", "cooldown", "daily_cap"]),
  name: z.string(),
  threshold_amount: z.coerce.number().int().nullable().default(null),
  threshold_percent: z.coerce.number().int().nullable().default(null),
  cooldown_days: z.coerce.number().int().nullable().default(null),
  enabled: z.boolean().default(true),
  created_at: optionalTimestampToIso.default(null),
}).passthrough();

export type UserDoc = z.infer<typeof userDocSchema>;
export type PreferencesDoc = z.infer<typeof preferencesDocSchema>;
export type GameDoc = z.infer<typeof gameDocSchema>;
export type GameConfigDoc = z.infer<typeof gameConfigDocSchema>;
export type SharedUserGameDoc = z.infer<typeof sharedUserGameDocSchema>;
export type GameStateDoc = z.infer<typeof gameStateDocSchema>;
export type BudgetDoc = z.infer<typeof budgetDocSchema>;
export type PaymentDoc = z.infer<typeof paymentDocSchema>;
export type BannerDoc = z.infer<typeof bannerDocSchema>;
export type UserBannerDoc = z.infer<typeof userBannerDocSchema>;
export type PullSessionDoc = z.infer<typeof pullSessionDocSchema>;
export type PullDoc = z.infer<typeof pullDocSchema>;
export type GachaLogDoc = z.infer<typeof gachaLogDocSchema>;
export type GuardrailRuleDoc = z.infer<typeof guardrailRuleDocSchema>;
