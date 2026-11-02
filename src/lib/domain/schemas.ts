import { z } from "zod";

export const firestoreIdSchema = z
  .string()
  .trim()
  .min(1, "식별자는 비어 있을 수 없습니다.")
  .max(1500, "식별자는 1500자를 초과할 수 없습니다.")
  .refine(
    (id) => new TextEncoder().encode(id).byteLength <= 1500 && !id.includes("/") && id !== "." && id !== ".." && !/^__.*__$/.test(id),
    { message: "유효하지 않은 Firestore 문서 식별자입니다." },
  );

const formBoolean = z.preprocess((value) => {
  if (value === "true" || value === "on" || value === true) {
    return true;
  }

  if (value === "false" || value === "off" || value === false) {
    return false;
  }

  return undefined;
}, z.boolean());

const emptyToUndefined = (value: unknown) =>
  value === undefined || value === null || value === "" ? undefined : value;

const optionalInteger = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().optional(),
);

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().optional(),
);

const dateOnly = z.iso.date();

export const paymentTypeSchema = z.enum([
  "gacha",
  "pass",
  "coin",
  "event",
  "other",
]);

export const bannerTypeSchema = z.enum([
  "character",
  "weapon",
  "standard",
  "event",
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
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  totalBudget: z.coerce.number().int().min(0),
  warningAt: z.coerce.number().int().min(1).max(100).default(70),
});

export const userGameSchema = z.object({
  gameId: firestoreIdSchema,
  nickname: z.string().trim().max(80).optional(),
  monthlyBudget: z.coerce.number().int().min(0).default(0),
  currentPity: z.coerce.number().int().min(0).default(0),
  warningThresholdPercent: z.coerce.number().int().min(1).max(100).default(70),
});

export const paymentSchema = z.object({
  userGameId: firestoreIdSchema,
  amount: positiveKrw,
  type: paymentTypeSchema,
  paidAt: z.string().datetime().optional(),
  memo: z.string().trim().max(500).optional(),
  regretScore: z.coerce.number().int().min(1).max(5).optional(),
});

export const updatePaymentSchema = paymentSchema.partial().extend({
  id: firestoreIdSchema,
});

export const googlePaymentImportRowSchema = z.object({
  userGameId: firestoreIdSchema,
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
  userGameId: firestoreIdSchema,
  currentPity: z.coerce.number().int().min(0),
});

export const gachaLogSchema = z.object({
  userGameId: firestoreIdSchema,
  pulls: z.coerce.number().int().positive(),
  result: z.string().trim().max(300).optional(),
  pityAtPull: z.coerce.number().int().min(0),
  pulledAt: z.string().datetime().optional(),
});

export const trackBannerSchema = z.object({
  bannerId: firestoreIdSchema,
});

export const customBannerSchema = z.object({
  gameId: firestoreIdSchema,
  name: z.string().trim().min(1).max(160),
  bannerType: bannerTypeSchema.default("character"),
  featured: z.string().trim().min(1).max(240),
  startsAtDate: dateOnly,
  endsAtDate: dateOnly,
  softPity: optionalInteger.pipe(z.number().int().min(0).optional()),
  hardPity: optionalInteger.pipe(z.number().int().positive().optional()),
  baseRate: optionalNumber.pipe(z.number().positive().max(1).optional()),
  rateUp: optionalNumber.pipe(z.number().min(0).max(1).optional()),
  sourceUrl: z.string().trim().url().max(500).optional(),
});

export const pullSessionSchema = z.object({
  userBannerId: firestoreIdSchema,
  pullsCount: z.coerce.number().int().min(1).max(100),
  rarity: z.coerce.number().int().min(3).max(5).default(3),
  itemName: z.string().trim().max(120).optional(),
  costPerPull: z.coerce.number().int().min(0).default(0),
  isRateUp: formBoolean.optional(),
  memo: z.string().trim().max(300).optional(),
  pulledAt: z.string().datetime().optional(),
});

export const updatePullSchema = z.object({
  id: firestoreIdSchema,
  rarity: z.coerce.number().int().min(3).max(5),
  itemName: z.string().trim().max(120).optional(),
  isRateUp: formBoolean.optional(),
});

export const guardrailRuleSchema = z.object({
  id: firestoreIdSchema.optional(),
  kind: guardrailRuleKindSchema,
  name: z.string().trim().min(1).max(120),
  thresholdAmount: optionalInteger.pipe(z.number().int().min(0).optional()),
  thresholdPercent: optionalInteger.pipe(z.number().int().min(1).max(200).optional()),
  cooldownDays: optionalInteger.pipe(z.number().int().min(1).max(30).optional()),
  enabled: formBoolean.default(true),
});

export const toggleGuardrailRuleSchema = z.object({
  id: firestoreIdSchema,
  enabled: formBoolean,
});

export const templateSchema = z.object({
  userGameId: firestoreIdSchema,
  name: z.string().trim().min(1).max(120),
  amount: positiveKrw,
  type: paymentTypeSchema.default("pass"),
  dayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
});
