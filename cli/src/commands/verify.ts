import chalk from "chalk";
import ora from "ora";
import { getBlockTime } from "../index";
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
  options: { owner?: string },
): Promise<void> {
  const normalized = normalizeHash(hash);
  if (!normalized) {
    console.error(
      chalk.red("Invalid hash: expected a 64-character hex SHA-256 digest"),
    );
    process.exitCode = 1;
    return;
  }

  const spinner = ora(`Checking anchors for ${normalized}`).start();
  let results: SearchResult[];
  try {
    results = await searchByHash(normalized, options.owner);
  } catch (err) {
    spinner.fail("Lookup failed");
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
    return;
  }

  if (results.length === 0) {
    spinner.stop();
    console.log(chalk.red.bold("Not Found"));
    console.log(
      chalk.dim(
        "No anchor exists for this hash. Batch anchors are owner-keyed; try --owner <principal> if you know the anchoring wallet.",
      ),
    );
    process.exitCode = 1;
    return;
  }

  spinner.stop();
  console.log(chalk.green.bold("Verified"));
  for (let i = 0; i < results.length; i++) {
    if (i > 0) console.log();
    await printMatch(results[i]);
  }
}
