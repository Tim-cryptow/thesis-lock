// Validates the NEXT_PUBLIC_* configuration the client reads at runtime. The
// required vars (the Hiro API base, the contract address, and the contract name)
// are dereferenced without a fallback in lib/stacks.ts and lib/feed.ts, so a
// missing one would silently build "undefined/..." URLs and contract calls;
// those throw. The optional vars (site URL, Supabase URL) have real fallbacks, so
// a missing one is only a warning. A present but malformed value (a non-URL API
// base, a bad principal, an illegal contract name) always throws. Next.js inlines
// these values at build time, so this checks the configuration the deployed
// bundle was actually built with.

import { validateStacksAddress } from "@stacks/transactions";

const CONTRACT_NAME = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;

export type EnvIssue = { name: string; reason: string };
export type EnvValidationResult = { missing: string[]; invalid: EnvIssue[] };

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type Rule = {
  name: string;
  value: string | undefined;
  valid: (value: string) => boolean;
  expected: string;
  // Required vars throw when unset (no fallback exists); optional vars only warn.
  required: boolean;
};

/**
 * Inspect the public environment without side effects. Returns the optional
 * names that are unset (and fall back to defaults) under `missing`, and under
 * `invalid` the ones that are present but malformed or required and unset.
 * Referencing process.env members directly lets Next inline them into the
 * client bundle.
 */
export function inspectEnv(): EnvValidationResult {
  const rules: Rule[] = [
    {
      name: "NEXT_PUBLIC_API_URL",
      value: process.env.NEXT_PUBLIC_API_URL,
      valid: isHttpUrl,
      expected: "an http(s) URL",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_CONTRACT_ADDRESS",
      value: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      valid: (v) => validateStacksAddress(v),
      expected: "a Stacks principal with a valid checksum",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_CONTRACT_NAME",
      value: process.env.NEXT_PUBLIC_CONTRACT_NAME,
      valid: (v) => CONTRACT_NAME.test(v),
      expected: "a Clarity contract name",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_SITE_URL",
      value: process.env.NEXT_PUBLIC_SITE_URL,
      valid: isHttpUrl,
      expected: "an http(s) URL",
      required: false,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      valid: isHttpUrl,
      expected: "an http(s) URL",
      required: false,
    },
  ];

  const missing: string[] = [];
  const invalid: EnvIssue[] = [];

  for (const rule of rules) {
    const trimmed = rule.value?.trim();
    if (!trimmed) {
      if (rule.required) {
        invalid.push({ name: rule.name, reason: "is required but unset" });
      } else {
        missing.push(rule.name);
      }
      continue;
    }
    if (!rule.valid(trimmed)) {
      invalid.push({ name: rule.name, reason: `expected ${rule.expected}` });
    }
  }

  return { missing, invalid };
}

export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    const detail = issues.map((issue) => `${issue.name} (${issue.reason})`).join(", ");
    super(`Invalid environment configuration: ${detail}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Validate and act on the result: warn once for any unset variable (defaults
 * apply) and throw EnvValidationError if any present variable is malformed.
 * Returns the inspection result so callers can log or surface details.
 */
export function validateEnv(): EnvValidationResult {
  const result = inspectEnv();

  if (result.missing.length > 0 && typeof console !== "undefined") {
    console.warn(
      `ThesisLock: NEXT_PUBLIC_* not set, using built-in defaults for ${result.missing.join(", ")}.`,
    );
  }

  if (result.invalid.length > 0) {
    throw new EnvValidationError(result.invalid);
  }

  return result;
}
