"use client";

import { useEffect, useRef, useState } from "react";
import ErrorPage from "./ErrorPage";
import { ClockIcon } from "./ErrorIcons";

type RateLimitErrorProps = {
  // Seconds to count down before automatically retrying.
  retryAfterSeconds?: number;
  // Called when the countdown reaches zero, or when the user clicks "Try now".
  onRetry?: () => void;
};

// Shown when the Hiro API responds with 429. A visible countdown auto-retries so
// the user does not have to babysit a transient rate limit.
export default function RateLimitError({ retryAfterSeconds = 30, onRetry }: RateLimitErrorProps) {
  const [seconds, setSeconds] = useState(retryAfterSeconds);

  // Hold the latest callback in a ref so the countdown effect depends only on
  // the remaining seconds, never restarting if the parent re-renders.
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  useEffect(() => {
    if (seconds <= 0) {
      onRetryRef.current?.();
      return;
    }
    const id = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return (
    <ErrorPage
      icon={<ClockIcon />}
      code="429"
      title="Too many requests"
      description="The blockchain API is rate limited. Please wait a moment and try again."
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-foreground/60 tabular-nums" aria-live="polite">
          {seconds > 0 ? `Retrying in ${seconds}s` : "Retrying"}
        </p>
        {onRetry ? (
          <button
            onClick={() => onRetry()}
            className="px-5 py-2.5 rounded-md bg-heading text-background text-sm font-medium hover:opacity-90 press-scale"
          >
            Try now
          </button>
        ) : null}
      </div>
    </ErrorPage>
  );
}
