// web, sdk, and cli each own their ESLint flat config and Prettier config. Flat
// config does not cascade across directories, so each package's tooling is
// pointed at that package's config explicitly. The commands are plain strings,
// so lint-staged appends the staged paths as separate process arguments without
// involving a shell; filenames with spaces or other characters are passed safely.
const eslintFix = (pkg) =>
  `${pkg}/node_modules/.bin/eslint --config ${pkg}/eslint.config.mjs --fix`;
const prettierWrite = (pkg) =>
  `${pkg}/node_modules/.bin/prettier --ignore-path ${pkg}/.prettierignore --write`;

export default {
  "web/**/*.{ts,tsx}": [eslintFix("web"), prettierWrite("web")],
  "web/**/*.{css,json,md}": [prettierWrite("web")],
  "sdk/**/*.ts": [eslintFix("sdk"), prettierWrite("sdk")],
  "sdk/**/*.{json,md}": [prettierWrite("sdk")],
  "cli/**/*.ts": [eslintFix("cli"), prettierWrite("cli")],
  "cli/**/*.{json,md}": [prettierWrite("cli")],
};
