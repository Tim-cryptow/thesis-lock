import tseslint from "typescript-eslint";

// Flat config for the Node/TypeScript SDK: the TypeScript parser plus a small
// set of reasonable rules. Linting is not type-aware on purpose, so it stays fast.
export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
