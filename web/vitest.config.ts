import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Vitest config for the lib utility unit tests and the React component tests,
// both run under jsdom. The "@" alias mirrors the tsconfig paths so component
// imports (for example "@/lib/favorites") resolve; the runner's automatic JSX
// runtime compiles .tsx without an explicit React import. End-to-end browser
// tests live separately under tests/ and run with Playwright (test:e2e).
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(root),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "lib/__tests__/**/*.test.ts",
      "app/components/__tests__/**/*.test.tsx",
      "app/api/__tests__/**/*.test.ts",
    ],
  },
});
