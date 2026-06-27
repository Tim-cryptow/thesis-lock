import chalk from "chalk";
import ora from "ora";
import { getBlockTime, SITE_URL } from "../index";
import { formatError, toJson } from "../output";
import { searchByHash, SearchResult } from "../search";

const HEX_64 = /^[0-9a-f]{64}$/;

function normalizeHash(input: string): string | null {
  const clean = (
    input.startsWith("0x") || input.startsWith("0X") ? input.slice(2) : input
  ).toLowerCase();
  return HEX_64.test(clean) ? clean : null;
}

function sourceDescription(result: SearchResult): string {
  switch (result.source) {
    case "single":
      return "thesislock (single anchor)";
    case "batch":
      return "thesislock-batch (batch anchor)";
    case "registry":
      return "thesislock-registry (registry entry)";
    case "proof":
      return "thesislock-proof (proof NFT)";
    case "group":
      return `thesislock-groups (group ${result.groupId ?? "?"}, index ${result.groupIndex ?? "?"})`;
  }
}

async function printMatch(result: SearchResult): Promise<void> {
  const timestamp = await getBlockTime(result.stacksBlock);
  console.log(`  ${chalk.bold("Source:")}    ${sourceDescription(result)}`);
  console.log(`  ${chalk.bold("Label:")}     ${result.label || chalk.dim("(none)")}`);
  console.log(`  ${chalk.bold("Owner:")}     ${result.owner || chalk.dim("(unknown)")}`);
  console.log(`  ${chalk.bold("Block:")}     ${result.stacksBlock}`);
  console.log(`  ${chalk.bold("Timestamp:")} ${timestamp ?? chalk.dim("(unavailable)")}`);
}

export async function verifyCommand(
  hash: string,
  options: { owner?: string; json?: boolean; quiet?: boolean },
): Promise<void> {
  const json = options.json === true;
  const quiet = options.quiet === true;
  const normalized = normalizeHash(hash);
  if (!normalized) {
    const message = "Invalid hash: expected a 64-character hex SHA-256 digest";
    if (json) {
      console.log(formatError(message, true));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
    return;
  }

  const spinner = json || quiet ? null : ora(`Checking anchors for ${normalized}`).start();
  let results: SearchResult[];
  try {
    results = await searchByHash(normalized, options.owner);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    spinner?.fail("Lookup failed");
    if (json) {
      console.log(formatError(message, true));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
    return;
  }

  spinner?.stop();

  if (json) {
    console.log(
      toJson({
        hash: normalized,
        verified: results.length > 0,
        count: results.length,
        results: results.map((r) => ({
          ...r,
          verifyUrl: `${SITE_URL}${r.verifyPath}`,
        })),
      }),
    );
    if (results.length === 0) process.exitCode = 1;
    return;
  }

  if (quiet) {
    console.log(results.length > 0 ? "true" : "false");
    if (results.length === 0) process.exitCode = 1;
    return;
  }

  if (results.length === 0) {
    console.log(chalk.red.bold("Not Found"));
    console.log(
      chalk.dim(
        "No anchor exists for this hash. Batch anchors are owner-keyed; try --owner <principal> if you know the anchoring wallet.",
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green.bold("Verified"));
  for (let i = 0; i < results.length; i++) {
    if (i > 0) console.log();
    await printMatch(results[i]!);
  }
}
