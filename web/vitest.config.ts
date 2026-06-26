import { defineConfig } from "vitest/config";

// Unit tests for the browser-local utility modules in lib/. They exercise
// localStorage-backed logic, so they run under jsdom. End-to-end browser tests
// live separately under tests/ and run with Playwright (test:e2e).
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["lib/__tests__/**/*.test.ts"],
  },
});
