import { test, expect } from "@playwright/test";

const NUMERIC = /^[\d,]+$/;

async function cardValue(page: import("@playwright/test").Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=following-sibling::div[1]");
}

test.describe("stats page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stats");
  });

  test("loads with the protocol stats heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Protocol stats" })).toBeVisible();
  });

  test("renders stat cards with real numbers", async ({ page }) => {
    for (const label of ["Total anchors", "Unique wallets", "Contracts deployed"]) {
      const value = await cardValue(page, label);
      await expect(value).toBeVisible();
      await expect(value).toHaveText(NUMERIC);
    }
  });
});
