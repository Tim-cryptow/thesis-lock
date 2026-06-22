import { test, expect } from "@playwright/test";
import { DEPLOYER_PRINCIPAL, KNOWN_ANCHORED_HASH } from "./constants";

test.describe("search page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("loads with the search heading and input", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Search anchors" }),
    ).toBeVisible();
    await expect(page.getByLabel("Search query")).toBeVisible();
  });

  test("shows the auto-detect hint and detected type", async ({ page }) => {
    await expect(
      page.getByText("Search by document hash, wallet address, or label."),
    ).toBeVisible();

    await page.getByLabel("Search query").fill(DEPLOYER_PRINCIPAL);
    await expect(page.getByText("Detected: principal.")).toBeVisible();
  });

  // The search route hits the live Hiro API and compiles on first dev hit, so
  // give these network-dependent flows extra headroom. A cold or rate-limited
  // upstream read can come back empty, and the page does not auto-retry, so the
  // search itself is retried until it settles into the expected state.
  const NET_TIMEOUT = 60_000;

  test("reports no results for a random label", async ({ page }) => {
    test.slow();
    const input = page.getByLabel("Search query");
    const searchButton = page.getByRole("button", { name: "Search" });
    const noResults = page.getByText("No results found");

    await input.fill("zzz-no-such-label-xyz-98765");
    await expect(async () => {
      await expect(searchButton).toBeEnabled();
      await searchButton.click();
      await expect(searchButton).toBeEnabled({ timeout: 20_000 });
      await expect(noResults).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: NET_TIMEOUT });
  });

  test("returns results for a known anchored hash", async ({ page }) => {
    // A hash search resolves through a direct point lookup of the anchor, so it
    // returns deterministically once the upstream read succeeds. A principal
    // search depends on a full registry scan that the API swallows on timeout,
    // which would make this assertion permanently flaky.
    test.slow();
    const input = page.getByLabel("Search query");
    const searchButton = page.getByRole("button", { name: "Search" });
    const verifyLink = page.getByRole("link", { name: /^Verify/ }).first();

    await input.fill(KNOWN_ANCHORED_HASH);
    await expect(async () => {
      await expect(searchButton).toBeEnabled();
      await searchButton.click();
      await expect(searchButton).toBeEnabled({ timeout: 20_000 });
      await expect(verifyLink).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: NET_TIMEOUT });
  });
});
