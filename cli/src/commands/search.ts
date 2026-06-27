import chalk from "chalk";
import ora from "ora";
import { SITE_URL, truncateMiddle } from "../index";
import { formatError, toJson } from "../output";
import { detectSearchType, runSearch, SearchResult } from "../search";

type Column = {
  header: string;
  width: number;
  value: (r: SearchResult) => string;
};

function printTable(results: SearchResult[]): void {
  const columns: Column[] = [
    { header: "SOURCE", width: 8, value: (r) => r.source },
    { header: "HASH", width: 19, value: (r) => truncateMiddle(r.hash) },
    {
      header: "LABEL",
      width: 24,
      value: (r) => (r.label.length > 24 ? `${r.label.slice(0, 21)}...` : r.label),
    },
    { header: "OWNER", width: 19, value: (r) => truncateMiddle(r.owner) },
    { header: "BLOCK", width: 9, value: (r) => String(r.stacksBlock) },
  ];

  const header = columns.map((c) => c.header.padEnd(c.width)).join("  ");
  console.log(chalk.bold(header));
  console.log(chalk.dim("-".repeat(header.length)));
  for (const r of results) {
    console.log(columns.map((c) => c.value(r).padEnd(c.width)).join("  "));
  }
  console.log();
  console.log(
    chalk.dim(`Verify any result at ${SITE_URL}/v/<hash> or with: thesislock verify <hash>`),
  );
}

function applyLimit(results: SearchResult[], limit?: number): SearchResult[] {
  if (limit === undefined) return results;
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 0) return results;
  return results.slice(0, n);
}

export async function searchCommand(
  query: string,
  options: { json?: boolean; quiet?: boolean; limit?: number },
): Promise<void> {
  const json = options.json === true;
  const quiet = options.quiet === true;
  const type = detectSearchType(query);
  const spinner =
    json || quiet ? null : ora(`Searching by ${type}: ${query}`).start();

  let results: SearchResult[];
  try {
    results = await runSearch(query, type);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    spinner?.fail("Search failed");
    if (json) {
      console.log(formatError(message, true));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
    return;
  }

  spinner?.stop();

  const limited = applyLimit(results, options.limit);

  if (json) {
    console.log(
      toJson(
        limited.map((r) => ({ ...r, verifyUrl: `${SITE_URL}${r.verifyPath}` })),
      ),
    );
    return;
  }

  if (quiet) {
    for (const r of limited) {
      console.log(r.hash);
    }
    if (limited.length === 0) process.exitCode = 1;
    return;
  }

  if (limited.length === 0) {
    console.log(chalk.red(`No results found for ${type} query: ${query}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    chalk.green(
      `${limited.length} result${limited.length === 1 ? "" : "s"} (${type} search)`,
    ),
  );
  console.log();
  printTable(limited);
}
