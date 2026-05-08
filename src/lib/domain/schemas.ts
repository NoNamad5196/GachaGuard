import { z } from "zod";

export const paymentTypeSchema = z.enum([
  "gacha",
  "pass",
  "coin",
  "event",
  "other",
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

export const templateSchema = z.object({
  userGameId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  amount: positiveKrw,
  type: paymentTypeSchema.default("pass"),
  dayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
});
