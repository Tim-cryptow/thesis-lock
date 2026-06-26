#!/usr/bin/env node
import { Command } from "commander";
import { batchCommand } from "../src/commands/batch";
import { hashCommand } from "../src/commands/hash";
import { searchCommand } from "../src/commands/search";
import { statusCommand } from "../src/commands/status";
import { verifyCommand } from "../src/commands/verify";

const program = new Command();

program
  .name("thesislock")
  .description(
    "Verify ThesisLock document anchors on the Stacks blockchain from the terminal",
  )
  .version("0.1.0");

program
  .command("verify")
  .description("Check whether a SHA-256 hash is anchored on Stacks")
  .argument("<hash>", "64-character hex SHA-256 hash")
  .option(
    "--owner <principal>",
    "Stacks principal to check for owner-keyed batch anchors",
  )
  .option("--json", "print machine-readable JSON output")
  .option("--quiet", "print only true or false")
  .action(verifyCommand);

program
  .command("hash")
  .description("Compute the SHA-256 hash of one or more files")
  .argument("<filepaths...>", "paths of files to hash")
  .option("--verify", "also check whether each hash is anchored on Stacks")
  .option("--json", "print machine-readable JSON output")
  .option("--quiet", "print only the hash for each file")
  .action(hashCommand);

program
  .command("status")
  .description(
    "Show protocol status, or anchor stats for a wallet when a principal is given",
  )
  .argument("[principal]", "Stacks principal to look up")
  .option("--json", "print machine-readable JSON output")
  .option("--quiet", "print only the health state or anchor count")
  .action(statusCommand);

program
  .command("search")
  .description("Search anchors by hash, wallet principal, or label substring")
  .argument("<query>", "64-hex hash, Stacks principal, or label text")
  .option("--json", "print machine-readable JSON output")
  .option("--quiet", "print only one matching hash per line")
  .option(
    "--limit <n>",
    "maximum number of results to show",
    (value) => parseInt(value, 10),
  )
  .action(searchCommand);

program
  .command("batch")
  .description("Hash every file in a directory")
  .argument("<dir>", "directory to scan")
  .option("--verify", "also check whether each hash is anchored on Stacks")
  .option("--recursive", "descend into subdirectories")
  .option("--exclude <patterns>", "comma-separated glob patterns to skip")
  .option("--json", "print machine-readable JSON output")
  .option("--quiet", "print only the hash for each file")
  .action(batchCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
