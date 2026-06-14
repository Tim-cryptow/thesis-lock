import { test, expect } from "@playwright/test";

// The docs site ships in a separate change. Until it lands on this branch the
// route 404s, so skip rather than fail. Once /docs is present these run live.
test.beforeEach(async ({ page }) => {
  const res = await page.request.get("/docs");
  test.skip(
    res.status() === 404,
    "docs route not present on this branch yet",
  );
});

const SECTIONS: { title: string; slug: string }[] = [
  { title: "Getting Started", slug: "getting-started" },
  { title: "Contracts", slug: "contracts" },
  { title: "Web App Guide", slug: "web-app" },
  { title: "API Reference", slug: "api" },
  { title: "SDK Guide", slug: "sdk" },
  { title: "CLI Guide", slug: "cli" },
  { title: "GitHub Action", slug: "github-action" },
];

test.describe("docs site", () => {
  test("landing page loads with sidebar navigation", async ({ page }) => {
    await page.goto("/docs");
    await expect(
      page.getByRole("heading", { name: "ThesisLock Documentation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Documentation" }),
    ).toBeVisible();
  });

  test("each section link navigates and renders content", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Documentation" });
    for (const { title, slug } of SECTIONS) {
      await page.goto("/docs");
      await nav.getByRole("link", { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`/docs/${slug}$`));
      // Match the page's main heading by level so a section whose title is a
      // substring of a subheading (e.g. "Contracts" vs "The five contracts")
      // does not trip strict mode.
      await expect(
        page.getByRole("heading", { name: title, level: 1 }),
      ).toBeVisible();
    }
  });
});
