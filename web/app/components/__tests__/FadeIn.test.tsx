import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FadeIn from "@/app/components/FadeIn";

// Hold the component in its initial (pre-transition) state by making the
// requestAnimationFrame callback never run, so the hidden-state styles that
// carry the direction transform can be asserted deterministically.
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FadeIn", () => {
  it("renders its children", () => {
    render(<FadeIn>Hello world</FadeIn>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("applies the hidden-state transform for the direction", () => {
    const { container } = render(<FadeIn direction="left">x</FadeIn>);
    expect((container.firstChild as HTMLElement).style.transform).toBe("translateX(12px)");
  });

  it("defaults to sliding up", () => {
    const { container } = render(<FadeIn>x</FadeIn>);
    expect((container.firstChild as HTMLElement).style.transform).toBe("translateY(12px)");
  });

  it("applies the delay to the transition", () => {
    const { container } = render(<FadeIn delay={200}>x</FadeIn>);
    expect((container.firstChild as HTMLElement).style.transitionDelay).toBe("200ms");
  });

  it("passes through a custom className", () => {
    const { container } = render(<FadeIn className="fade-wrapper">x</FadeIn>);
    expect((container.firstChild as HTMLElement).className).toContain("fade-wrapper");
  });

  it("renders as the element named by the as prop", () => {
    const { container } = render(<FadeIn as="li">x</FadeIn>);
    expect((container.firstChild as HTMLElement).tagName).toBe("LI");
  });

  it("shows content immediately when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { container } = render(<FadeIn>x</FadeIn>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.opacity).toBe("1");
    expect(el.style.transition).toBe("none");
  });
});
