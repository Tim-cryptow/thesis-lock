#!/usr/bin/env node
// Subresource Integrity (SRI) audit.
//
// SRI lets a browser verify that a resource it fetches from another origin (a
// <script src> or a stylesheet <link href> on a CDN) matches a known hash, so a
// compromised CDN cannot inject altered code. It only applies to resources the
// page loads by URL from a third party; inline scripts and same-origin assets
// are out of scope.
//
// ThesisLock loads no third-party scripts or stylesheets: the Content-Security
// -Policy pins script-src and style-src to 'self', fonts are self-hosted by
// next/font at build time, and the only inline scripts (theme bootstrap and
// JSON-LD) carry no src. This script proves that property in CI: it scans the
// app and public assets for any external <script>/<link>/<Script> resource that
// lacks an integrity attribute and fails if one appears. Today it should report
// zero external subresources. If a future change adds a CDN dependency, this
// audit turns red until an integrity hash is attached.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");

// Directories whose source can emit <script>/<link> tags into the document.
const SCAN_DIRS = ["app", "public"];
const SCAN_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".html", ".htm"];

/** Recursively collect files with a scannable extension. */
function collectFiles(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full));
      continue;
    }
    if (SCAN_EXTENSIONS.some((ext) => full.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

// Match an opening <script>, <link> (HTML), or <Script> (next/script) tag up to
// its first '>'. Case-sensitive on purpose so the next/navigation <Link> router
// component is not mistaken for an HTML <link>.
const TAG_RE = /<(script|link|Script)\b[^>]*>/g;
// A src/href whose value begins with http(s): or a protocol-relative // is
// external. The optional brace, quote, or backtick handles JSX expression
// values (src={"https://..."}, src={'...'}, src={`...`}) and unquoted HTML
// attributes, so a third-party URL in any of those forms is still caught.
const EXTERNAL_RE = /\b(?:src|href)\s*=\s*\{?\s*["'`]?\s*(?:https?:|\/\/)/i;
const INTEGRITY_RE = /\bintegrity\s*=/i;

const violations = [];
let externalCount = 0;
let tagCount = 0;

for (const relDir of SCAN_DIRS) {
  for (const file of collectFiles(join(webRoot, relDir))) {
    const content = readFileSync(file, "utf8");
    const matches = content.match(TAG_RE);
    if (!matches) continue;
    for (const tag of matches) {
      tagCount += 1;
      if (!EXTERNAL_RE.test(tag)) continue;
      externalCount += 1;
      if (!INTEGRITY_RE.test(tag)) {
        violations.push({ file: file.replace(`${webRoot}/`, ""), tag: tag.slice(0, 120) });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Subresource integrity audit FAILED.");
  console.error("External script/link resources without an integrity attribute:");
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.tag}`);
  }
  console.error("\nAdd an integrity hash (and crossorigin) or self-host the resource.");
  process.exit(1);
}

console.log(
  `Subresource integrity audit passed: scanned ${tagCount} script/link tag(s), ` +
    `${externalCount} external. No external subresource is missing an integrity attribute.`,
);
process.exit(0);
