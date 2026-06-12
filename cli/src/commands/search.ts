import chalk from "chalk";
import ora from "ora";
import { SITE_URL, truncateMiddle } from "../index";
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

export async function searchCommand(
  query: string,
  options: { json?: boolean },
): Promise<void> {
  const type = detectSearchType(query);
  const spinner = options.json
    ? null
    : ora(`Searching by ${type}: ${query}`).start();

  let results: SearchResult[];
  try {
    results = await runSearch(query, type);
  } catch (err) {
    spinner?.fail("Search failed");
    const message = err instanceof Error ? err.message : String(err);
    if (options.json) {
      console.log(JSON.stringify({ error: message }));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
    return;
  }

  spinner?.stop();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          query,
          type,
          count: results.length,
          results: results.map((r) => ({
            ...r,
            verifyUrl: `${SITE_URL}${r.verifyPath}`,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (results.length === 0) {
    console.log(chalk.red(`No results for ${type} query: ${query}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    chalk.green(`${results.length} result${results.length === 1 ? "" : "s"} (${type} search)`),
  );
  console.log();
  printTable(results);
}
