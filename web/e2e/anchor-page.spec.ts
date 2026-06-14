import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

const FILE_CONTENT = "thesislock e2e fixture content\n";
const EXPECTED_HASH = createHash("sha256").update(FILE_CONTENT).digest("hex");

test.describe("anchor page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/anchor");
  });

  test("loads with the anchor heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Anchor a document" }),
    ).toBeVisible();
  });

  test("prompts to connect a wallet when none is connected", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Connect wallet" }),
    ).toBeVisible();
  });

  test("toggles between single and batch modes", async ({ page }) => {
    const single = page.getByRole("button", { name: "Anchor a single file" });
    const batch = page.getByRole("button", { name: /Anchor a batch of up to/ });

    await expect(single).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", {
        name: "Drop a file here to hash it, or click to choose one",
      }),
    ).toBeVisible();

    await batch.click();
    await expect(batch).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Drop up to 10 files here/)).toBeVisible();
  });

  test("hashes a dropped file locally and shows the digest", async ({
    page,
  }) => {
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "fixture.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(FILE_CONTENT),
      });

    const hashRegion = page.getByRole("region", { name: "Document hash" });
    await expect(hashRegion).toContainText(EXPECTED_HASH);
    await expect(
      page.getByRole("button", { name: "Copy document hash to clipboard" }),
    ).toBeVisible();
  });

  test("label input accepts text and shows a character count", async ({
    page,
  }) => {
    const label = page.getByLabel(/^Label/);
    await label.fill("chapter-3-draft");
    await expect(page.getByText("15/64")).toBeVisible();
  });

  test("label rejects non-ASCII characters", async ({ page }) => {
    await page.getByLabel(/^Label/).fill("café résumé");
    await expect(page.getByText("Labels must be ASCII only.")).toBeVisible();
  });
});
