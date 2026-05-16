import { expect, test } from "@playwright/test";
import path from "node:path";

test("root opens the dashboard first", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("demo dashboard shows the redesigned GachaGuard flow", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("이번 달 지출")).toBeVisible();
  await expect(page.getByText("추적 중인 배너")).toBeVisible();
  await expect(page.getByText("빠른 지출 기록")).toBeVisible();
  await expect(page.getByRole("main").getByText("로그인하면 저장 가능")).toBeVisible();
});

test("demo navigation exposes banners, pull log, budget, and settings", async ({ page }) => {
  await page.goto("/banners");
  await expect(page.getByRole("heading", { name: "Banners" })).toBeVisible();
  await expect(page.getByText("푸른 서약")).toBeVisible();

  await page.goto("/pulls");
  await expect(page.getByRole("heading", { name: "Pull Log" })).toBeVisible();
  await expect(page.getByText("표시 비용")).toBeVisible();

  await page.goto("/budget");
  await expect(page.getByRole("heading", { name: "Budget & Guardrails" })).toBeVisible();
  await expect(page.getByText("가드레일 규칙")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("추적 중인 게임")).toBeVisible();
});

test("demo Google payment import parses a purchase fixture", async ({ page }) => {
  await page.goto("/imports/google");

  await expect(page.getByRole("heading", { name: "Google 결제 가져오기" })).toBeVisible();
  await page
    .getByLabel("Google 결제 파일")
    .setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "google-play-purchases.json"));

  await expect(page.getByText("Genesis Crystal Pack")).toBeVisible();
  await expect(page.getByText("₩33,000").first()).toBeVisible();
  await expect(page.getByText("저장은 로그인 후 가능합니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "선택 항목 저장" })).toBeDisabled();
});

test("login route redirects back to inline auth on the next path", async ({ page }) => {
  await page.goto("/login?next=/imports/google");

  await expect(page).toHaveURL(/\/imports\/google\?auth=required$/);
  await expect(page.getByRole("heading", { name: "Google 결제 가져오기" })).toBeVisible();
  await expect(page.getByText("저장하려면 먼저 로그인해 주세요.")).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue("/imports/google");
});

test("auth callback errors return to inline auth with a clear message", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied&next=/imports/google");

  await expect(page).toHaveURL(/\/imports\/google\?auth=callback-error$/);
  await expect(page.getByText("인증 링크 확인에 실패했습니다")).toBeVisible();
});
