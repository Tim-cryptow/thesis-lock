"use client";

import {
  createElement,
  useEffect,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

type FadeInProps = {
  children: ReactNode;
  // Delay before the transition starts, in milliseconds.
  delay?: number;
  // Transition length, in milliseconds.
  duration?: number;
  // The direction the content travels in from while fading in.
  direction?: Direction;
  className?: string;
  // The element to render as. Defaults to a div; pass "li" to fade in a list
  // row without nesting an invalid div inside a ul/ol.
  as?: ElementType;
};

const HIDDEN_TRANSFORM: Record<Direction, string> = {
  up: "translateY(12px)",
  down: "translateY(-12px)",
  left: "translateX(12px)",
  right: "translateX(-12px)",
  none: "none",
};

// Fades its children in on mount, optionally sliding them in from a direction.
// Pure CSS transitions, no animation library. Honors prefers-reduced-motion by
// showing the content immediately with no movement.
export default function FadeIn({
  children,
  delay = 0,
  duration = 300,
  direction = "up",
  className,
  as = "div",
}: FadeInProps) {
  const [visible, setVisible] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setInstant(true);
      setVisible(true);
      return;
    }
    // Flip to visible on the next frame so the hidden styles are committed first
    // and the browser actually transitions between the two states.
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return createElement(
    as,
    {
      className,
      style: {
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : HIDDEN_TRANSFORM[direction],
        transition: instant
          ? "none"
          : `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
        transitionDelay: instant ? "0ms" : `${delay}ms`,
        willChange: "opacity, transform",
      },
    },
    children,
  );
}
