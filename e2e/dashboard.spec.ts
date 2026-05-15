import { expect, test } from "@playwright/test";

test("demo dashboard shows the redesigned GachaGuard flow", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("이번 달 지출")).toBeVisible();
  await expect(page.getByText("추적 중인 배너")).toBeVisible();
  await expect(page.getByText("빠른 지출 기록")).toBeVisible();
  await expect(page.getByRole("main").getByText("Demo Mode")).toBeVisible();
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
