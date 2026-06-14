"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  durationMs?: number;
  className?: string;
};

export default function AnimatedCounter({
  value,
  durationMs = 1000,
  className,
}: Props) {
  const [display, setDisplay] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
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
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / durationMs, 1);
      // Ease-out so the count decelerates into its final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, visible, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("en-US")}
    </span>
  );
}
