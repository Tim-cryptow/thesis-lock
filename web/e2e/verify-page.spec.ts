import { test, expect, type Page } from "@playwright/test";
import { KNOWN_ANCHORED_HASH, UNANCHORED_HASH } from "./constants";

// The verify page resolves an anchor with a live on-chain read. A cold dev
// route or a rate-limited upstream can drop the page into its error state,
// which only recovers when the user clicks "Try again". Drive that retry until
// the lookup settles, so the assertion reflects the on-chain truth rather than
// a transient API hiccup.
async function settleLookup(
  page: Page,
  expectation: () => Promise<void>,
): Promise<void> {
  const tryAgain = page.getByRole("button", { name: "Try again" });
  await expect(async () => {
    if (await tryAgain.isVisible()) await tryAgain.click();
    await expectation();
  }).toPass({ timeout: 60_000 });
}

test.describe("verify page", () => {
  test("rejects an invalid hash format", async ({ page }) => {
    await page.goto("/v/not-a-real-hash");
    await expect(
      page.getByRole("heading", { name: "Invalid hash format." }),
    ).toBeVisible();
    await expect(
      page.getByText("A valid hash is 64 lowercase hex characters."),
    ).toBeVisible();
  });

  test("reports an unanchored hash", async ({ page }) => {
    test.slow();
    await page.goto(`/v/${UNANCHORED_HASH}`);
    await settleLookup(page, async () => {
      await expect(
        page.getByText("This hash has not been anchored."),
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test("shows verification details for a known anchored hash", async ({
    page,
  }) => {
    test.slow();
    await page.goto(`/v/${KNOWN_ANCHORED_HASH}`);

    await expect(
      page.getByRole("heading", { name: "Anchor record" }),
    ).toBeVisible();
    // The on-chain lookup resolves to the anchored record fields.
    await settleLookup(page, async () => {
      await expect(page.getByText("Anchored by")).toBeVisible({
        timeout: 5_000,
      });
    });
    await expect(page.getByText("Stacks block").first()).toBeVisible();
    await expect(
      page.getByText("This hash has not been anchored."),
    ).toHaveCount(0);
  });

  test("offers badge embedding and share links for a verified anchor", async ({
    page,
  }) => {
    test.slow();
    await page.goto(`/v/${KNOWN_ANCHORED_HASH}`);

    // The badge and share cards only render once the anchor resolves.
    await settleLookup(page, async () => {
      await expect(
        page.getByRole("heading", { name: "Embed a badge" }),
      ).toBeVisible({ timeout: 5_000 });
    });
    const copyLink = page.getByRole("button", {
      name: "Copy verification link to clipboard",
    });
    await expect(copyLink).toBeVisible();
  });
});
