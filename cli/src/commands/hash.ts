import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import chalk from "chalk";
import { field, formatSize, toJson } from "../output";
import { searchByHash } from "../search";

interface HashEntry {
  file: string;
  size?: number;
  hash?: string;
  anchored?: boolean;
  anchor?: { source: string; owner: string; stacksBlock: number };
  error?: string;
  verifyError?: string;
}

// Streamed so multi-gigabyte files hash without loading into memory. Exported so
// the batch command can reuse the exact same digest routine.
export function hashFileStream(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const digest = createHash("sha256");
    const stream = createReadStream(filepath);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(digest.digest("hex")));
  });
}

async function computeEntry(
  filepath: string,
  verify: boolean,
): Promise<HashEntry> {
  let stats;
  try {
    stats = statSync(filepath);
  } catch {
    return { file: filepath, error: "Cannot read file" };
  }
  if (!stats.isFile()) {
    return { file: filepath, error: "Not a file" };
  }

  let hash: string;
  try {
    hash = await hashFileStream(filepath);
  } catch (err) {
    return {
      file: filepath,
      error: `Hashing failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const entry: HashEntry = { file: filepath, size: stats.size, hash };
  if (verify) {
    try {
      const results = await searchByHash(hash);
      if (results.length > 0) {
        entry.anchored = true;
        entry.anchor = {
          source: results[0].source,
          owner: results[0].owner,
          stacksBlock: results[0].stacksBlock,
        };
      } else {
        entry.anchored = false;
      }
    } catch (err) {
      entry.verifyError = err instanceof Error ? err.message : String(err);
    }
  }
  return entry;
}

function renderEntry(entry: HashEntry, verify: boolean): void {
  if (entry.error !== undefined) {
    console.error(chalk.red(`${entry.error}: ${entry.file}`));
    return;
  }
  console.log(field("File", entry.file));
  console.log(field("Size", formatSize(entry.size ?? 0)));
  console.log(field("Hash", entry.hash ?? ""));
  if (!verify) return;
  if (entry.verifyError !== undefined) {
    console.error(chalk.red(`Anchor lookup failed: ${entry.verifyError}`));
  } else if (entry.anchored && entry.anchor) {
    console.log(
      field(
        "Anchor",
        `${chalk.green("Verified")} (${entry.anchor.source}, block ${entry.anchor.stacksBlock}, owner ${entry.anchor.owner})`,
      ),
    );
  } else {
    console.log(field("Anchor", chalk.red("Not Found")));
  }
}

function entryFailed(entry: HashEntry): boolean {
  return (
    entry.error !== undefined ||
    entry.verifyError !== undefined ||
    entry.anchored === false
  );
}

export async function hashCommand(
  filepaths: string[],
  options: { verify?: boolean; json?: boolean },
): Promise<void> {
  const json = options.json === true;
  const verify = options.verify === true;

  const entries: HashEntry[] = [];
  for (const filepath of filepaths) {
    entries.push(await computeEntry(filepath, verify));
  }

  if (json) {
    console.log(toJson(entries));
  } else {
    entries.forEach((entry, i) => {
      if (i > 0) console.log();
      renderEntry(entry, verify);
    });
  }

  if (entries.some(entryFailed)) {
    process.exitCode = 1;
  }
}
