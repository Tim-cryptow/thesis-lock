#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("thesislock")
  .description(
    "Verify ThesisLock document anchors on the Stacks blockchain from the terminal",
  )
  .version("0.1.0");

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
