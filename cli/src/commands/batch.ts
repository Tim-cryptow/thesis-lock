import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import chalk from "chalk";
import { field, formatSize, toJson } from "../output";
import { searchByHash } from "../search";
import { hashFileStream } from "./hash";

interface BatchEntry {
  file: string;
  path: string;
  size?: number;
  hash?: string;
  anchored?: boolean;
  anchor?: { source: string; owner: string; stacksBlock: number };
  error?: string;
  verifyError?: string;
}

// A small glob matcher for the --exclude patterns: only * and ? are special,
// matched against a single path segment (a file or directory name).
function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function parseExcludes(exclude?: string): RegExp[] {
  if (!exclude) return [];
  return exclude
    .split(",")
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map(globToRegExp);
}

function isExcluded(name: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(name));
}

interface Walk {
  files: string[];
  failedDirs: string[];
}

function collectFiles(dir: string, recursive: boolean, patterns: RegExp[]): Walk {
  const files: string[] = [];
  const failedDirs: string[] = [];

  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    // An unreadable directory (permissions, or one removed mid-scan) should not
    // abort the whole walk. Record it and keep going so partial results, and
    // valid JSON, still come through.
    failedDirs.push(dir);
    return { files, failedDirs };
  }

  for (const entry of dirents) {
    if (isExcluded(entry.name, patterns)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        const sub = collectFiles(full, recursive, patterns);
        files.push(...sub.files);
        failedDirs.push(...sub.failedDirs);
      }
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return { files, failedDirs };
}

async function computeEntry(
  baseDir: string,
  filepath: string,
  verify: boolean,
): Promise<BatchEntry> {
  const path = relative(baseDir, filepath) || filepath;
  let size: number;
  try {
    size = statSync(filepath).size;
  } catch {
    return { file: filepath, path, error: "Cannot read file" };
  }

  let hash: string;
  try {
    hash = await hashFileStream(filepath);
  } catch (err) {
    return {
      file: filepath,
      path,
      error: `Hashing failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const entry: BatchEntry = { file: filepath, path, size, hash };
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

function entryFailed(entry: BatchEntry): boolean {
  return entry.error !== undefined || entry.verifyError !== undefined || entry.anchored === false;
}

function renderEntry(entry: BatchEntry, verify: boolean): void {
  if (entry.error !== undefined) {
    console.error(chalk.red(`${entry.error}: ${entry.path}`));
    return;
  }
  console.log(field("File", entry.path));
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

export async function batchCommand(
  dir: string,
  options: {
    verify?: boolean;
    json?: boolean;
    quiet?: boolean;
    recursive?: boolean;
    exclude?: string;
  },
): Promise<void> {
  const json = options.json === true;
  const quiet = options.quiet === true;
  const verify = options.verify === true;
  const recursive = options.recursive === true;

  let stat;
  try {
    stat = statSync(dir);
  } catch {
    const message = `Cannot read directory: ${dir}`;
    if (json) console.log(toJson({ error: message }));
    else console.error(chalk.red(message));
    process.exitCode = 1;
    return;
  }
  if (!stat.isDirectory()) {
    const message = `Not a directory: ${dir}`;
    if (json) console.log(toJson({ error: message }));
    else console.error(chalk.red(message));
    process.exitCode = 1;
    return;
  }

  const patterns = parseExcludes(options.exclude);
  const walk = collectFiles(dir, recursive, patterns);
  const files = walk.files.sort();

  const entries: BatchEntry[] = [];
  for (const file of files) {
    entries.push(await computeEntry(dir, file, verify));
  }
  // Surface directories that could not be read as error entries, so JSON mode
  // stays valid and the failure is visible instead of crashing the command.
  for (const failed of walk.failedDirs.sort()) {
    entries.push({
      file: failed,
      path: relative(dir, failed) || failed,
      error: "Cannot read directory",
    });
  }

  if (json) {
    console.log(toJson(entries));
  } else if (quiet) {
    for (const entry of entries) {
      if (entry.error !== undefined) {
        console.error(chalk.red(`${entry.error}: ${entry.path}`));
      } else if (entry.hash !== undefined) {
        console.log(entry.hash);
      }
    }
  } else if (entries.length === 0) {
    console.log(chalk.dim("No files found."));
  } else {
    entries.forEach((entry, i) => {
      if (i > 0) console.log();
      renderEntry(entry, verify);
    });
    const hashed = entries.filter((e) => e.hash !== undefined).length;
    console.log();
    console.log(chalk.dim(`${hashed} file${hashed === 1 ? "" : "s"} hashed in ${dir}`));
  }

  if (entries.some(entryFailed)) {
    process.exitCode = 1;
  }
}
