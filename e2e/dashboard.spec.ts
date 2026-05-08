import { expect, test } from "@playwright/test";

test("demo dashboard shows the core GachaGuard flow", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "GachaGuard" })).toBeVisible();
  await expect(page.getByText("이번 달 총 과금")).toBeVisible();
  await expect(page.getByText("빠른 과금 입력")).toBeVisible();
  await expect(page.getByText("천장 트래커")).toBeVisible();
  await expect(page.getByText("최근 과금 기록")).toBeVisible();
  await expect(page.getByText("Demo Mode")).toBeVisible();
});
