import path from "node:path";

// web, sdk, and cli each own their ESLint flat config and Prettier config.
// Flat config does not cascade across directories, so each package's tooling is
// run from inside that package on the files staged there. lint-staged passes
// absolute paths; rebase them onto the package directory first.
const root = process.cwd();

function inPackage(pkg, bin, flags) {
  return (files) => {
    const pkgDir = path.join(root, pkg);
    const rel = files.map((file) => path.relative(pkgDir, file)).join(" ");
    return `bash -c "cd ${pkg} && ./node_modules/.bin/${bin} ${flags} ${rel}"`;
  };
}

const eslintFix = (pkg) => inPackage(pkg, "eslint", "--fix");
const prettierWrite = (pkg) => inPackage(pkg, "prettier", "--write");

export default {
  "web/**/*.{ts,tsx}": [eslintFix("web"), prettierWrite("web")],
  "web/**/*.{css,json,md}": [prettierWrite("web")],
  "sdk/**/*.ts": [eslintFix("sdk"), prettierWrite("sdk")],
  "sdk/**/*.{json,md}": [prettierWrite("sdk")],
  "cli/**/*.ts": [eslintFix("cli"), prettierWrite("cli")],
  "cli/**/*.{json,md}": [prettierWrite("cli")],
};
