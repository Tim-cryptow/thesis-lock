import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TruncatedHash from "@/app/components/TruncatedHash";

const H = `abcdef0123456789${"0".repeat(32)}9876543210fedcba`;

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("TruncatedHash", () => {
  it("renders the hash truncated to the first and last characters", () => {
    render(<TruncatedHash hash={H} />);
    expect(screen.getByText(`${H.slice(0, 8)}...${H.slice(-8)}`)).toBeInTheDocument();
  });

  it("keeps the full hash in the title for hover", () => {
    render(<TruncatedHash hash={H} />);
    expect(screen.getByTitle(H)).toBeInTheDocument();
  });

  it("copies the full hash when the text is clicked", async () => {
    render(<TruncatedHash hash={H} />);
    fireEvent.click(screen.getByTitle(H));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(H));
  });

  it("respects the chars prop", () => {
    render(<TruncatedHash hash={H} chars={4} />);
    expect(screen.getByText(`${H.slice(0, 4)}...${H.slice(-4)}`)).toBeInTheDocument();
  });

  it("shows an inline copy button by default", () => {
    render(<TruncatedHash hash={H} />);
    expect(screen.getByRole("button", { name: "Copy hash to clipboard" })).toBeInTheDocument();
  });

  it("hides the inline copy button when copyable is false", () => {
    render(<TruncatedHash hash={H} copyable={false} />);
    expect(
      screen.queryByRole("button", { name: "Copy hash to clipboard" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders nothing for an empty hash", () => {
    const { container } = render(<TruncatedHash hash="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not truncate a short hash", () => {
    render(<TruncatedHash hash="abcd" copyable={false} />);
    expect(screen.getByText("abcd")).toBeInTheDocument();
  });
});
