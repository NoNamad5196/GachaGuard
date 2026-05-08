"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMonthRange } from "@/lib/domain/calculations";
import {
  budgetSchema,
  gachaLogSchema,
  paymentSchema,
  pitySchema,
  templateSchema,
  updatePaymentSchema,
  userGameSchema,
} from "@/lib/domain/schemas";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function normalizeFormData(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? undefined : value,
    ]),
  );
}

async function requireSession() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase 환경 변수가 없어 데모 모드로 실행 중입니다.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return { supabase, user };
}

export async function requestMagicLink(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/?auth=demo");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/?auth=missing-email");
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect("/?auth=error");
  }

  redirect("/?auth=sent");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function upsertBudget(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = budgetSchema.parse(normalizeFormData(formData));

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      year_month: input.yearMonth,
      total_budget: input.totalBudget,
      warning_at: input.warningAt,
    },
    { onConflict: "user_id,year_month" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function addUserGame(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = userGameSchema.parse(normalizeFormData(formData));

  const { error } = await supabase.from("user_games").upsert(
    {
      user_id: user.id,
      game_id: input.gameId,
      nickname: input.nickname || null,
      monthly_budget: input.monthlyBudget,
      current_pity: input.currentPity,
      warning_threshold_percent: input.warningThresholdPercent,
      is_active: true,
    },
    { onConflict: "user_id,game_id" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function updatePity(formData: FormData) {
  const { supabase } = await requireSession();
  const input = pitySchema.parse(normalizeFormData(formData));

  const { error } = await supabase
    .from("user_games")
    .update({ current_pity: input.currentPity })
    .eq("id", input.userGameId);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function createPayment(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = paymentSchema.parse(normalizeFormData(formData));

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    user_game_id: input.userGameId,
    amount: input.amount,
    type: input.type,
    paid_at: input.paidAt ?? new Date().toISOString(),
    memo: input.memo || null,
    regret_score: input.regretScore ?? null,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function updatePayment(formData: FormData) {
  const { supabase } = await requireSession();
  const input = updatePaymentSchema.parse(normalizeFormData(formData));

  const { id, userGameId, paidAt, regretScore, ...rest } = input;
  const { error } = await supabase
    .from("payments")
    .update({
      ...rest,
      user_game_id: userGameId,
      paid_at: paidAt,
      regret_score: regretScore,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function deletePayment(formData: FormData) {
  const { supabase } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function createGachaLog(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = gachaLogSchema.parse(normalizeFormData(formData));

  const { error } = await supabase.from("gacha_logs").insert({
    user_id: user.id,
    user_game_id: input.userGameId,
    pulls: input.pulls,
    result: input.result || null,
    pity_at_pull: input.pityAtPull,
    pulled_at: input.pulledAt ?? new Date().toISOString(),
  });

  if (error) {
    throw error;
  }

  await supabase
    .from("user_games")
    .update({ current_pity: input.pityAtPull + input.pulls })
    .eq("id", input.userGameId);

  revalidatePath("/dashboard");
}

export async function createPaymentTemplate(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = templateSchema.parse(normalizeFormData(formData));

  const { error } = await supabase.from("payment_templates").insert({
    user_id: user.id,
    user_game_id: input.userGameId,
    name: input.name,
    amount: input.amount,
    type: input.type,
    day_of_month: input.dayOfMonth,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}

export async function applyMonthlyTemplates() {
  const { supabase, user } = await requireSession();
  const { yearMonth, year, month } = getMonthRange();

  const { data: templates, error: templateError } = await supabase
    .from("payment_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (templateError) {
    throw templateError;
  }

  const targets = (templates ?? []).filter(
    (template) => template.last_applied_year_month !== yearMonth,
  );

  if (targets.length === 0) {
    revalidatePath("/dashboard");
    return;
  }

  const { error } = await supabase.from("payments").insert(
    targets.map((template) => ({
      user_id: user.id,
      user_game_id: template.user_game_id,
      amount: template.amount,
      type: template.type,
      paid_at: new Date(
        Date.UTC(year, month - 1, template.day_of_month, -9),
      ).toISOString(),
      memo: `${template.name} 자동 반복`,
    })),
  );

  if (error) {
    throw error;
  }

  await Promise.all(
    targets.map((template) =>
      supabase
        .from("payment_templates")
        .update({ last_applied_year_month: yearMonth })
        .eq("id", template.id),
    ),
  );

  revalidatePath("/dashboard");
}
