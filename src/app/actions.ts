"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getMonthRange } from "@/lib/domain/calculations";
import {
  budgetSchema,
  gachaLogSchema,
  guardrailRuleSchema,
  paymentSchema,
  pitySchema,
  pullSessionSchema,
  templateSchema,
  toggleGuardrailRuleSchema,
  trackBannerSchema,
  updatePullSchema,
  updatePaymentSchema,
  userGameSchema,
} from "@/lib/domain/schemas";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

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

export async function trackBanner(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = trackBannerSchema.parse(normalizeFormData(formData));

  const { data: banner, error: bannerError } = await supabase
    .from("banners")
    .select("id, game_id")
    .eq("id", input.bannerId)
    .single();

  if (bannerError) {
    throw bannerError;
  }

  const userGameResult = await supabase
    .from("user_games")
    .select("id, current_pity")
    .eq("user_id", user.id)
    .eq("game_id", banner.game_id)
    .maybeSingle();
  let userGame = userGameResult.data;

  if (userGameResult.error) {
    throw userGameResult.error;
  }

  if (!userGame) {
    const { data: createdUserGame, error: createUserGameError } = await supabase
      .from("user_games")
      .insert({
        user_id: user.id,
        game_id: banner.game_id,
        current_pity: 0,
        monthly_budget: 0,
        warning_threshold_percent: 70,
        is_active: true,
      })
      .select("id, current_pity")
      .single();

    if (createUserGameError) {
      throw createUserGameError;
    }

    userGame = createdUserGame;
  }

  const { error } = await supabase.from("user_banners").upsert(
    {
      user_id: user.id,
      user_game_id: userGame.id,
      banner_id: banner.id,
      current_pity: userGame.current_pity,
      is_tracking: true,
    },
    { onConflict: "user_id,banner_id" },
  );

  if (error) {
    throw error;
  }

  revalidateTrackedRoutes(input.bannerId);
}

export async function createPullSession(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = pullSessionSchema.parse(normalizeFormData(formData));

  const { data: userBanner, error: userBannerError } = await supabase
    .from("user_banners")
    .select("id, user_game_id, current_pity, pulls_total, pulls_5_star, banners(hard_pity)")
    .eq("id", input.userBannerId)
    .eq("user_id", user.id)
    .single();

  if (userBannerError) {
    throw userBannerError;
  }

  const pulledAt = input.pulledAt ?? new Date().toISOString();
  const totalCost = input.costPerPull * input.pullsCount;

  const { data: session, error: sessionError } = await supabase
    .from("pull_sessions")
    .insert({
      user_id: user.id,
      user_banner_id: input.userBannerId,
      pulls_count: input.pullsCount,
      total_cost: totalCost,
      currency: "KRW",
      memo: input.memo || null,
      pulled_at: pulledAt,
    })
    .select("id")
    .single();

  if (sessionError) {
    throw sessionError;
  }

  const resultIndex = input.pullsCount;
  const pullRows = Array.from({ length: input.pullsCount }, (_, index) => {
    const pullNumber = index + 1;
    const isResultPull = pullNumber === resultIndex;
    const rarity = isResultPull ? input.rarity : 3;

    return {
      user_id: user.id,
      pull_session_id: session.id,
      user_banner_id: input.userBannerId,
      pull_number: pullNumber,
      pity_before: userBanner.current_pity + index,
      rarity,
      item_name: isResultPull
        ? input.itemName || `${rarity}성 결과`
        : "일반 결과",
      cost: input.costPerPull,
      is_rate_up: rarity === 5 ? input.isRateUp ?? null : null,
      pulled_at: pulledAt,
    };
  });

  const { error: pullsError } = await supabase.from("pulls").insert(pullRows);

  if (pullsError) {
    throw pullsError;
  }

  await recalculateBannerState(supabase, user.id, input.userBannerId);
  revalidateTrackedRoutes();
}

export async function updatePullResult(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = updatePullSchema.parse(normalizeFormData(formData));

  const { data: pull, error: pullError } = await supabase
    .from("pulls")
    .select("user_banner_id")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .single();

  if (pullError) {
    throw pullError;
  }

  const { error } = await supabase
    .from("pulls")
    .update({
      rarity: input.rarity,
      item_name: input.itemName || null,
      is_rate_up: input.rarity === 5 ? input.isRateUp ?? null : null,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  await recalculateBannerState(supabase, user.id, pull.user_banner_id);
  revalidateTrackedRoutes();
}

export async function deletePull(formData: FormData) {
  const { supabase, user } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const { data: pull, error: pullError } = await supabase
    .from("pulls")
    .select("user_banner_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (pullError) {
    throw pullError;
  }

  const { error } = await supabase
    .from("pulls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  await recalculateBannerState(supabase, user.id, pull.user_banner_id);
  revalidateTrackedRoutes();
}

export async function upsertGuardrailRule(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = guardrailRuleSchema.parse(normalizeFormData(formData));

  if (input.id) {
    const { error } = await supabase
      .from("guardrail_rules")
      .update({
        kind: input.kind,
        name: input.name,
        threshold_amount: input.thresholdAmount ?? null,
        threshold_percent: input.thresholdPercent ?? null,
        cooldown_days: input.cooldownDays ?? null,
        enabled: input.enabled,
      })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("guardrail_rules").insert({
      user_id: user.id,
      kind: input.kind,
      name: input.name,
      threshold_amount: input.thresholdAmount ?? null,
      threshold_percent: input.thresholdPercent ?? null,
      cooldown_days: input.cooldownDays ?? null,
      enabled: input.enabled,
    });

    if (error) {
      throw error;
    }
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function toggleGuardrailRule(formData: FormData) {
  const { supabase, user } = await requireSession();
  const input = toggleGuardrailRuleSchema.parse(normalizeFormData(formData));

  const { error } = await supabase
    .from("guardrail_rules")
    .update({ enabled: input.enabled })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

function revalidateTrackedRoutes(bannerId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/banners");
  revalidatePath("/pulls");
  revalidatePath("/budget");

  if (bannerId) {
    revalidatePath(`/banners/${bannerId}`);
  }
}

async function recalculateBannerState(
  supabase: SupabaseClient<Database>,
  userId: string,
  userBannerId: string,
) {
  const { data: userBanner, error: userBannerError } = await supabase
    .from("user_banners")
    .select("id, user_game_id")
    .eq("id", userBannerId)
    .eq("user_id", userId)
    .single();

  if (userBannerError) {
    throw userBannerError;
  }

  const { data: pulls, error: pullsError } = await supabase
    .from("pulls")
    .select("rarity")
    .eq("user_id", userId)
    .eq("user_banner_id", userBannerId)
    .order("pulled_at", { ascending: true })
    .order("pull_number", { ascending: true });

  if (pullsError) {
    throw pullsError;
  }

  let currentPity = 0;
  let fiveStarCount = 0;

  for (const pull of pulls ?? []) {
    if (pull.rarity >= 5) {
      currentPity = 0;
      fiveStarCount += 1;
    } else {
      currentPity += 1;
    }
  }

  const pullsTotal = pulls?.length ?? 0;

  const { error: updateBannerError } = await supabase
    .from("user_banners")
    .update({
      current_pity: currentPity,
      pulls_total: pullsTotal,
      pulls_5_star: fiveStarCount,
    })
    .eq("id", userBannerId)
    .eq("user_id", userId);

  if (updateBannerError) {
    throw updateBannerError;
  }

  const { error: updateGameError } = await supabase
    .from("user_games")
    .update({ current_pity: currentPity })
    .eq("id", userBanner.user_game_id)
    .eq("user_id", userId);

  if (updateGameError) {
    throw updateGameError;
  }
}
