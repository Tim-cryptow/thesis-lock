import { test, expect } from "@playwright/test";

test.describe("feed page", () => {
  test("loads with the recent anchors heading", async ({ page }) => {
    await page.goto("/feed");
    await expect(
      page.getByRole("heading", { name: "Recent anchors" }),
    ).toBeVisible();
  });

  test("shows anchor entries or an empty state", async ({ page }) => {
    await page.goto("/feed");

    const firstEntry = page.getByRole("link", { name: /^Verify/ }).first();
    const emptyState = page.getByText("No recent activity");
    await expect(firstEntry.or(emptyState)).toBeVisible();

    // When the live feed has entries, each row exposes the core anchor fields.
    if (await firstEntry.isVisible()) {
      await expect(page.getByText("Label").first()).toBeVisible();
      await expect(page.getByText("By", { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/^block /).first()).toBeVisible();
    }
  });
});
