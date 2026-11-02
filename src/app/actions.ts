"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthRedirectPath } from "@/lib/auth/redirects";
import {
  budgetSchema,
  customBannerSchema,
  gachaLogSchema,
  firestoreIdSchema,
  googlePaymentImportSchema,
  guardrailRuleSchema,
  paymentSchema,
  pitySchema,
  pullSessionSchema,
  templateSchema,
  toggleGuardrailRuleSchema,
  trackBannerSchema,
  updatePaymentSchema,
  updatePullSchema,
  userGameSchema,
} from "@/lib/domain/schemas";
import { hasFirebaseEnv } from "@/lib/firebase/env";
import { getSessionUser, SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import {
  addUserGame as firestoreAddUserGame,
  applyMonthlyTemplates as firestoreApplyMonthlyTemplates,
  createCustomBanner as firestoreCreateCustomBanner,
  createGachaLog as firestoreCreateGachaLog,
  createPayment as firestoreCreatePayment,
  createPaymentTemplate as firestoreCreatePaymentTemplate,
  createPullSession as firestoreCreatePullSession,
  deletePayment as firestoreDeletePayment,
  deletePull as firestoreDeletePull,
  importGooglePayments as firestoreImportGooglePayments,
  toggleGuardrailRule as firestoreToggleGuardrailRule,
  trackBanner as firestoreTrackBanner,
  updatePayment as firestoreUpdatePayment,
  updatePity as firestoreUpdatePity,
  updatePullResult as firestoreUpdatePullResult,
  upsertBudget as firestoreUpsertBudget,
  upsertGuardrailRule as firestoreUpsertGuardrailRule,
} from "@/lib/firestore";

function normalizeFormData(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? undefined : value,
    ]),
  );
}

async function requireSession(nextPath = "/dashboard") {
  if (!hasFirebaseEnv()) {
    redirect(getAuthRedirectPath({ auth: "demo", next: nextPath }));
  }

  const user = await getSessionUser();
  if (!user || !user.uid) {
    redirect(getAuthRedirectPath({ auth: "required", next: nextPath }));
  }

  return { uid: user.uid, user };
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

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/dashboard");
}

export async function upsertBudget(formData: FormData) {
  const { uid } = await requireSession("/budget");
  const input = budgetSchema.parse(normalizeFormData(formData));
  await firestoreUpsertBudget(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function addUserGame(formData: FormData) {
  const { uid } = await requireSession("/settings");
  const input = userGameSchema.parse(normalizeFormData(formData));
  await firestoreAddUserGame(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function updatePity(formData: FormData) {
  const { uid } = await requireSession("/dashboard");
  const input = pitySchema.parse(normalizeFormData(formData));
  await firestoreUpdatePity(uid, input);

  revalidatePath("/dashboard");
}

export async function createPayment(formData: FormData) {
  const { uid } = await requireSession("/dashboard");
  const input = paymentSchema.parse(normalizeFormData(formData));
  await firestoreCreatePayment(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function updatePayment(formData: FormData) {
  const { uid } = await requireSession("/dashboard");
  const input = updatePaymentSchema.parse(normalizeFormData(formData));
  await firestoreUpdatePayment(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function deletePayment(formData: FormData) {
  const { uid } = await requireSession("/dashboard");
  const id = firestoreIdSchema.parse(formData.get("id"));
  await firestoreDeletePayment(uid, id);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function importGooglePayments(payload: unknown) {
  const { uid } = await requireSession("/imports/google");
  const input = googlePaymentImportSchema.parse(payload);
  const result = await firestoreImportGooglePayments(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/settings");
  revalidatePath("/imports/google");

  return result;
}

export async function createGachaLog(formData: FormData) {
  const { uid } = await requireSession("/dashboard");
  const input = gachaLogSchema.parse(normalizeFormData(formData));
  await firestoreCreateGachaLog(uid, input);

  revalidatePath("/dashboard");
}

export async function createPaymentTemplate(formData: FormData) {
  const { uid } = await requireSession("/settings");
  const input = templateSchema.parse(normalizeFormData(formData));
  await firestoreCreatePaymentTemplate(uid, input);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function applyMonthlyTemplates() {
  const { uid } = await requireSession("/settings");
  await firestoreApplyMonthlyTemplates(uid);

  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function createCustomBanner(formData: FormData) {
  const { uid } = await requireSession("/banners/new");
  const input = customBannerSchema.parse(normalizeFormData(formData));
  const { bannerId } = await firestoreCreateCustomBanner(uid, input);

  revalidateTrackedRoutes(bannerId);
  redirect(`/banners/${bannerId}`);
}

export async function trackBanner(formData: FormData) {
  const { uid } = await requireSession("/banners");
  const input = trackBannerSchema.parse(normalizeFormData(formData));
  await firestoreTrackBanner(uid, input);

  revalidateTrackedRoutes(input.bannerId);
}

export async function createPullSession(formData: FormData) {
  const { uid } = await requireSession("/pulls");
  const input = pullSessionSchema.parse(normalizeFormData(formData));
  await firestoreCreatePullSession(uid, input);

  revalidateTrackedRoutes();
}

export async function updatePullResult(formData: FormData) {
  const { uid } = await requireSession("/pulls");
  const input = updatePullSchema.parse(normalizeFormData(formData));
  await firestoreUpdatePullResult(uid, input);

  revalidateTrackedRoutes();
}

export async function deletePull(formData: FormData) {
  const { uid } = await requireSession("/pulls");
  const id = firestoreIdSchema.parse(formData.get("id"));
  await firestoreDeletePull(uid, id);

  revalidateTrackedRoutes();
}

export async function upsertGuardrailRule(formData: FormData) {
  const { uid } = await requireSession("/budget");
  const input = guardrailRuleSchema.parse(normalizeFormData(formData));
  await firestoreUpsertGuardrailRule(uid, input);

  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function toggleGuardrailRule(formData: FormData) {
  const { uid } = await requireSession("/budget");
  const input = toggleGuardrailRuleSchema.parse(normalizeFormData(formData));
  await firestoreToggleGuardrailRule(uid, input);

  revalidatePath("/budget");
  revalidatePath("/dashboard");
}
