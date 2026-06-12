#!/usr/bin/env node
import { Command } from "commander";
import { hashCommand } from "../src/commands/hash";
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
  .action(verifyCommand);

program
  .command("hash")
  .description("Compute the SHA-256 hash of one or more files")
  .argument("<filepaths...>", "paths of files to hash")
  .option("--verify", "also check whether each hash is anchored on Stacks")
  .action(hashCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
