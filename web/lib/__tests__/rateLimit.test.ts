import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitError, checkRateLimit, isRateLimitError, resetRateLimits } from "../rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the limit within a window", () => {
    expect(() => {
      checkRateLimit("a", { limit: 3, windowMs: 1000 });
      checkRateLimit("a", { limit: 3, windowMs: 1000 });
      checkRateLimit("a", { limit: 3, windowMs: 1000 });
    }).not.toThrow();
  });

  it("throws once the window budget is exhausted", () => {
    for (let i = 0; i < 3; i += 1) {
      checkRateLimit("b", { limit: 3, windowMs: 1000 });
    }
    expect(() => checkRateLimit("b", { limit: 3, windowMs: 1000 })).toThrow(RateLimitError);
  });

  it("refills after the window elapses", () => {
    for (let i = 0; i < 3; i += 1) {
      checkRateLimit("c", { limit: 3, windowMs: 1000 });
    }
    vi.advanceTimersByTime(1000);
    expect(() => checkRateLimit("c", { limit: 3, windowMs: 1000 })).not.toThrow();
  });

  it("tracks separate keys independently", () => {
    checkRateLimit("d", { limit: 1, windowMs: 1000 });
    expect(() => checkRateLimit("e", { limit: 1, windowMs: 1000 })).not.toThrow();
    expect(() => checkRateLimit("d", { limit: 1, windowMs: 1000 })).toThrow(RateLimitError);
  });

  it("reports a positive retryAfterMs on the thrown error", () => {
    checkRateLimit("f", { limit: 1, windowMs: 5000 });
    try {
      checkRateLimit("f", { limit: 1, windowMs: 5000 });
      throw new Error("expected a RateLimitError");
    } catch (error) {
      expect(isRateLimitError(error)).toBe(true);
      expect((error as RateLimitError).retryAfterMs).toBeGreaterThan(0);
      expect((error as RateLimitError).retryAfterMs).toBeLessThanOrEqual(5000);
    }
  });
});
