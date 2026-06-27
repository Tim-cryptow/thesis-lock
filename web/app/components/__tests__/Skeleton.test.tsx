import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonLine, SkeletonCircle, SkeletonBlock } from "@/app/components/Skeleton";

describe("SkeletonLine", () => {
  it("renders with the default width and height", () => {
    const { container } = render(<SkeletonLine />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveStyle({ width: "100%", height: "1rem" });
    expect(el.getAttribute("class")).toContain("skeleton");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("renders with a custom width", () => {
    const { container } = render(<SkeletonLine width="50%" />);
    expect(container.firstChild as HTMLElement).toHaveStyle({ width: "50%" });
  });

  it("renders with a custom height", () => {
    const { container } = render(<SkeletonLine height="2rem" />);
    expect(container.firstChild as HTMLElement).toHaveStyle({ height: "2rem" });
  });

  it("passes through a custom className", () => {
    const { container } = render(<SkeletonLine className="mt-2" />);
    expect((container.firstChild as HTMLElement).getAttribute("class")).toContain("mt-2");
  });
});

describe("SkeletonCircle", () => {
  it("renders a round shape with the default size", () => {
    const { container } = render(<SkeletonCircle />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveStyle({ width: "2.5rem", height: "2.5rem" });
    expect(el.getAttribute("class")).toContain("rounded-full");
  });

  it("renders with a custom size", () => {
    const { container } = render(<SkeletonCircle size="4rem" />);
    expect(container.firstChild as HTMLElement).toHaveStyle({
      width: "4rem",
      height: "4rem",
    });
  });
});

describe("SkeletonBlock", () => {
  it("renders with custom dimensions", () => {
    const { container } = render(<SkeletonBlock width="120px" height="60px" />);
    expect(container.firstChild as HTMLElement).toHaveStyle({
      width: "120px",
      height: "60px",
    });
  });
});
