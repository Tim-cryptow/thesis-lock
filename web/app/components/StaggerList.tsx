"use client";

import { Children, isValidElement, type ReactNode } from "react";
import FadeIn from "./FadeIn";

type StaggerListProps = {
  children: ReactNode;
  // Milliseconds added between each successive child's fade-in.
  staggerDelay?: number;
  // Delay before the first child starts, in milliseconds.
  baseDelay?: number;
  // The direction children slide in from.
  direction?: "up" | "down" | "left" | "right" | "none";
};

// The stagger is capped after this many items so a long list (a busy feed, a
// large anchor set) does not take seconds to finish appearing; later items
// share the final delay and come in together.
const MAX_STAGGERED = 12;

// Wraps a list of children and fades them in one after another. Render it inside
// the existing list container so each item keeps its place in the layout:
//
//   <ul className="space-y-3">
//     <StaggerList>{rows.map((r) => <li key={r.id}>...</li>)}</StaggerList>
//   </ul>
export default function StaggerList({
  children,
  staggerDelay = 50,
  baseDelay = 0,
  direction = "up",
}: StaggerListProps) {
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, index) => {
        const key =
          isValidElement(child) && child.key != null ? child.key : index;
        const delay = baseDelay + Math.min(index, MAX_STAGGERED) * staggerDelay;
        return (
          <FadeIn key={key} delay={delay} direction={direction}>
            {child}
          </FadeIn>
        );
      })}
    </>
  );
}
