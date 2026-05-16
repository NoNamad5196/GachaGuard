import { z } from "zod";

const formBoolean = z.preprocess((value) => {
  if (value === "true" || value === "on" || value === true) {
    return true;
  }

  if (value === "false" || value === "off" || value === false) {
    return false;
  }

  return undefined;
}, z.boolean());

export const paymentTypeSchema = z.enum([
  "gacha",
  "pass",
  "coin",
  "event",
  "other",
]);

export const guardrailRuleKindSchema = z.enum([
  "warning",
  "hard_stop",
  "cooldown",
  "daily_cap",
]);

const positiveKrw = z.coerce
  .number()
  .int("원화 금액은 정수로 입력해 주세요.")
  .positive("금액은 1원 이상이어야 합니다.");

export const budgetSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  totalBudget: z.coerce.number().int().min(0),
  warningAt: z.coerce.number().int().min(1).max(100).default(70),
});

export const userGameSchema = z.object({
  gameId: z.string().uuid(),
  nickname: z.string().trim().max(80).optional(),
  monthlyBudget: z.coerce.number().int().min(0).default(0),
  currentPity: z.coerce.number().int().min(0).default(0),
  warningThresholdPercent: z.coerce.number().int().min(1).max(100).default(70),
});

export const paymentSchema = z.object({
  userGameId: z.string().uuid(),
  amount: positiveKrw,
  type: paymentTypeSchema,
  paidAt: z.string().datetime().optional(),
  memo: z.string().trim().max(500).optional(),
  regretScore: z.coerce.number().int().min(1).max(5).optional(),
});

export const updatePaymentSchema = paymentSchema.partial().extend({
  id: z.string().uuid(),
});

export const googlePaymentImportRowSchema = z.object({
  userGameId: z.string().uuid(),
  amount: positiveKrw,
  type: paymentTypeSchema,
  paidAt: z.string().datetime(),
  source: z.enum(["google_play", "google_pay"]),
  externalOrderId: z.string().trim().max(160).nullable().optional(),
  importFingerprint: z.string().trim().min(12).max(180),
  merchant: z.string().trim().max(160).nullable().optional(),
  rawDescription: z.string().trim().min(1).max(600),
  currency: z.literal("KRW"),
});

export const googlePaymentImportSchema = z.object({
  rows: z.array(googlePaymentImportRowSchema).min(1).max(500),
});

export const pitySchema = z.object({
  userGameId: z.string().uuid(),
  currentPity: z.coerce.number().int().min(0),
});

export const gachaLogSchema = z.object({
  userGameId: z.string().uuid(),
  pulls: z.coerce.number().int().positive(),
  result: z.string().trim().max(300).optional(),
  pityAtPull: z.coerce.number().int().min(0),
  pulledAt: z.string().datetime().optional(),
});

export const trackBannerSchema = z.object({
  bannerId: z.string().uuid(),
});

export const pullSessionSchema = z.object({
  userBannerId: z.string().uuid(),
  pullsCount: z.coerce.number().int().min(1).max(100),
  rarity: z.coerce.number().int().min(3).max(5).default(3),
  itemName: z.string().trim().max(120).optional(),
  costPerPull: z.coerce.number().int().min(0).default(0),
  isRateUp: formBoolean.optional(),
  memo: z.string().trim().max(300).optional(),
  pulledAt: z.string().datetime().optional(),
});

export const updatePullSchema = z.object({
  id: z.string().uuid(),
  rarity: z.coerce.number().int().min(3).max(5),
  itemName: z.string().trim().max(120).optional(),
  isRateUp: formBoolean.optional(),
});

export const guardrailRuleSchema = z.object({
  id: z.string().uuid().optional(),
  kind: guardrailRuleKindSchema,
  name: z.string().trim().min(1).max(120),
  thresholdAmount: z.coerce.number().int().min(0).optional(),
  thresholdPercent: z.coerce.number().int().min(1).max(200).optional(),
  cooldownDays: z.coerce.number().int().min(1).max(30).optional(),
  enabled: formBoolean.default(true),
});

export const toggleGuardrailRuleSchema = z.object({
  id: z.string().uuid(),
  enabled: formBoolean,
});

export const templateSchema = z.object({
  userGameId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  amount: positiveKrw,
  type: paymentTypeSchema.default("pass"),
  dayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
});
