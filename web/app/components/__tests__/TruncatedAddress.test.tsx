import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import TruncatedAddress from "@/app/components/TruncatedAddress";

// Render next/link as a plain anchor so the component does not need a Next
// router context in the test environment.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const SP = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const ST = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("TruncatedAddress", () => {
  it("renders the address as a two-character prefix and tail", () => {
    render(<TruncatedAddress address={SP} />);
    expect(screen.getByText(`SP...${SP.slice(-6)}`)).toBeInTheDocument();
  });

  it("links to the wallet profile by default", () => {
    render(<TruncatedAddress address={SP} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/u/${SP}`);
  });

  it("renders no link when linkToProfile is false", () => {
    render(<TruncatedAddress address={SP} linkToProfile={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(`SP...${SP.slice(-6)}`)).toBeInTheDocument();
  });

  it("handles a testnet ST address", () => {
    render(<TruncatedAddress address={ST} />);
    expect(screen.getByText(`ST...${ST.slice(-6)}`)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", `/u/${ST}`);
  });

  it("shows an inline copy button by default", () => {
    render(<TruncatedAddress address={SP} />);
    expect(
      screen.getByRole("button", { name: "Copy address to clipboard" }),
    ).toBeInTheDocument();
  });

  it("hides the copy button when copyable is false", () => {
    render(<TruncatedAddress address={SP} copyable={false} />);
    expect(
      screen.queryByRole("button", { name: "Copy address to clipboard" }),
    ).not.toBeInTheDocument();
  });

  it("respects the chars prop", () => {
    render(<TruncatedAddress address={SP} chars={4} />);
    expect(screen.getByText(`SP...${SP.slice(-4)}`)).toBeInTheDocument();
  });

  it("renders nothing for an empty address", () => {
    const { container } = render(<TruncatedAddress address="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
