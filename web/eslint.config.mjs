import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Focused flat config for ESLint 9 (required by Next 16). It wires the
// TypeScript parser and the React Hooks plugin and applies a small set of
// reasonable rules. Linting is not type-aware on purpose, so it stays fast.
export default tseslint.config(
  {
    ignores: [".next/**", "coverage/**", "public/**", "next-env.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "warn",
    },
  },
);
