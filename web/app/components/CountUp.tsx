"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  // Animation length, in milliseconds.
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

// Animates a number toward its target value, starting once it scrolls into
// view. The first reveal counts up from zero; if the value later changes (for
// example a live-updating stat), it animates from the previous value to the new
// one. Honors prefers-reduced-motion by jumping straight to the value.
export default function CountUp({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  // The value the next animation counts up from.
  const fromRef = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || duration <= 0) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic so the count decelerates into its final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, visible, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
