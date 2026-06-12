import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { searchByHash } from "../search";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Streamed so multi-gigabyte files hash without loading into memory.
function hashFileStream(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const digest = createHash("sha256");
    const stream = createReadStream(filepath);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(digest.digest("hex")));
  });
}

export async function hashCommand(
  filepaths: string[],
  options: { verify?: boolean },
): Promise<void> {
  let failures = 0;

  for (let i = 0; i < filepaths.length; i++) {
    const filepath = filepaths[i];
    if (i > 0) console.log();

    let size: number;
    try {
      const stats = statSync(filepath);
      if (!stats.isFile()) {
        console.error(chalk.red(`Not a file: ${filepath}`));
        failures++;
        continue;
      }
      size = stats.size;
    } catch {
      console.error(chalk.red(`Cannot read file: ${filepath}`));
      failures++;
      continue;
    }

    let hash: string;
    try {
      hash = await hashFileStream(filepath);
    } catch (err) {
      console.error(
        chalk.red(
          `Hashing failed for ${filepath}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      failures++;
      continue;
    }

    console.log(`${chalk.bold("File:")} ${filepath}`);
    console.log(`${chalk.bold("Size:")} ${formatSize(size)}`);
    console.log(`${chalk.bold("Hash:")} ${hash}`);

    if (options.verify) {
      const spinner = ora("Checking anchor").start();
      try {
        const results = await searchByHash(hash);
        spinner.stop();
        if (results.length > 0) {
          const first = results[0];
          console.log(
            `${chalk.bold("Anchor:")} ${chalk.green("Verified")} (${first.source}, block ${first.stacksBlock}, owner ${first.owner})`,
          );
        } else {
          console.log(`${chalk.bold("Anchor:")} ${chalk.red("Not Found")}`);
          failures++;
        }
      } catch (err) {
        spinner.fail("Anchor lookup failed");
        console.error(
          chalk.red(err instanceof Error ? err.message : String(err)),
        );
        failures++;
      }
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}
