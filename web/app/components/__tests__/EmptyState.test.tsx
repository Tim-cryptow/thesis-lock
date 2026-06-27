import { describe, it, expect, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EmptyState from "@/app/components/EmptyState";

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

describe("EmptyState", () => {
  it("renders the icon, title, and description", () => {
    render(
      <EmptyState
        icon={<span data-testid="icon" />}
        title="Nothing here yet"
        description="Anchor a document to get started."
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nothing here yet" })).toBeInTheDocument();
    expect(screen.getByText("Anchor a document to get started.")).toBeInTheDocument();
  });

  it("renders the primary CTA as a link when actionHref is given", () => {
    render(
      <EmptyState
        icon={null}
        title="t"
        description="d"
        actionLabel="Anchor a file"
        actionHref="/anchor"
      />,
    );
    expect(screen.getByRole("link", { name: "Anchor a file" })).toHaveAttribute("href", "/anchor");
  });

  it("renders the primary CTA as a button and fires onAction", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={null}
        title="t"
        description="d"
        actionLabel="Connect wallet"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders no CTA when no action is provided", () => {
    render(<EmptyState icon={null} title="t" description="d" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("requires both a label and a target to show the primary CTA", () => {
    render(<EmptyState icon={null} title="t" description="d" actionLabel="Orphan" />);
    expect(screen.queryByText("Orphan")).not.toBeInTheDocument();
  });

  it("renders a secondary action", () => {
    render(
      <EmptyState
        icon={null}
        title="t"
        description="d"
        secondaryLabel="Learn more"
        secondaryHref="/docs"
      />,
    );
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute("href", "/docs");
  });

  it("fires onSecondary for a secondary button", () => {
    const onSecondary = vi.fn();
    render(
      <EmptyState
        icon={null}
        title="t"
        description="d"
        secondaryLabel="Skip"
        onSecondary={onSecondary}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("disables the primary button when actionDisabled is set", () => {
    render(
      <EmptyState
        icon={null}
        title="t"
        description="d"
        actionLabel="Go"
        onAction={() => {}}
        actionDisabled
      />,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });
});
