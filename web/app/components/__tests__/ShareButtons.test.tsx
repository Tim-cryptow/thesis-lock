import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareButtons from "@/app/components/ShareButtons";

const URL = "https://thesis-lock.vercel.app/v/abc123";
const TITLE = "Verify on ThesisLock";

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("ShareButtons", () => {
  it("renders the copy control and the three share targets", () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share on X" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share on LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share on Telegram" })).toBeInTheDocument();
  });

  it("copies the URL when the copy button is clicked", async () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
  });

  it("shows Copied! feedback after copying", async () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("builds the X share href with the encoded text and url", () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    const href = screen.getByRole("link", { name: "Share on X" }).getAttribute("href");
    expect(href).toContain("https://twitter.com/intent/tweet?text=");
    expect(href).toContain(encodeURIComponent(TITLE));
    expect(href).toContain(encodeURIComponent(URL));
  });

  it("builds the LinkedIn share href", () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    const href = screen.getByRole("link", { name: "Share on LinkedIn" }).getAttribute("href");
    expect(href).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(URL)}`,
    );
  });

  it("builds the Telegram share href", () => {
    render(<ShareButtons url={URL} title={TITLE} />);
    const href = screen.getByRole("link", { name: "Share on Telegram" }).getAttribute("href");
    expect(href).toContain("https://t.me/share/url?url=");
    expect(href).toContain(encodeURIComponent(URL));
  });

  it("uses the explicit text over the title in share links", () => {
    render(<ShareButtons url={URL} title={TITLE} text="Custom share text" />);
    const href = screen.getByRole("link", { name: "Share on X" }).getAttribute("href");
    expect(href).toContain(encodeURIComponent("Custom share text"));
  });

  it("disables every control when no url is given", () => {
    render(<ShareButtons url="" title={TITLE} />);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share on X" })).toBeDisabled();
  });
});
