import tseslint from "typescript-eslint";

// Flat config for the CLI. The terminal is the CLI's output channel, so
// no-console is intentionally off here; the rest mirrors the SDK config.
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
      "no-console": "off",
    },
  },
);
