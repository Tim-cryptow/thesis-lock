import { test, expect } from "@playwright/test";

test.describe("landing page and navigation", () => {
  test("landing page loads with the site title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ThesisLock/);
    await expect(
      page.getByRole("heading", {
        name: "Prove any document existed. On Bitcoin.",
      }),
    ).toBeVisible();
  });

  test("hero links navigate to their pages", async ({ page }) => {
    const links: { name: string; path: string }[] = [
      { name: "Anchor a Document", path: "/anchor" },
      { name: "Verify a Hash", path: "/search" },
    ];

    for (const { name, path } of links) {
      await page.goto("/");
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test("footer exposes docs and api links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Docs" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "API" })).toBeVisible();
  });

  test("back to home link returns to the landing page from a sub page", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.getByRole("link", { name: /ThesisLock/ }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: "Prove any document existed. On Bitcoin.",
      }),
    ).toBeVisible();
  });

  test("theme toggle is present and cycles modes", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Theme:/ });
    await expect(toggle).toBeVisible();

    const initial = await toggle.getAttribute("aria-label");
    await toggle.click();
    await expect(toggle).not.toHaveAttribute("aria-label", initial ?? "");
  });
});
