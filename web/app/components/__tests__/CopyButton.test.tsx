import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CopyButton from "@/app/components/CopyButton";

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("CopyButton", () => {
  it("renders a button with the default accessible label", () => {
    render(<CopyButton value="hello" />);
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
  });

  it("uses the provided label in the accessible name", () => {
    render(<CopyButton value="hello" label="hash" />);
    expect(screen.getByRole("button", { name: "Copy hash to clipboard" })).toBeInTheDocument();
  });

  it("writes the value to the clipboard on click", async () => {
    render(<CopyButton value="abc123" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("abc123"));
  });

  it("shows Copied! feedback after a successful copy", async () => {
    render(<CopyButton value="abc123" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("does not show the value by default", () => {
    render(<CopyButton value="secret-value" />);
    expect(screen.queryByText("secret-value")).not.toBeInTheDocument();
  });

  it("renders the value when showValue is set", () => {
    render(<CopyButton value="visible-value" showValue />);
    expect(screen.getByText("visible-value")).toBeInTheDocument();
  });

  it("uses small icon sizing for size=sm", () => {
    const { container } = render(<CopyButton value="x" size="sm" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("h-3.5");
  });

  it("uses medium icon sizing by default", () => {
    const { container } = render(<CopyButton value="x" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("h-4 w-4");
  });

  it("does not show Copied! when the clipboard write fails", async () => {
    writeText.mockRejectedValue(new Error("blocked"));
    render(<CopyButton value="abc123" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });
});
