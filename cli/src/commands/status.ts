import chalk from "chalk";
import ora from "ora";
import { apiUrl, CONTRACT_ADDRESS, CONTRACT_NAMES, getClient } from "../index";
import { formatError, toJson } from "../output";

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

type ApiStatus = {
  status?: string;
  chain_tip?: { block_height?: number };
};

type StatusOptions = { json?: boolean; quiet?: boolean };

function contractIds(): string[] {
  return CONTRACT_NAMES.map((name) => `${CONTRACT_ADDRESS}.${name}`);
}

async function fetchApiStatus(): Promise<{
  healthy: boolean;
  latestBlock: number | null;
}> {
  try {
    const res = await fetch(`${apiUrl()}/extended/`);
    if (!res.ok) return { healthy: false, latestBlock: null };
    const data = (await res.json()) as ApiStatus;
    const height = data.chain_tip?.block_height;
    return {
      healthy: true,
      latestBlock: typeof height === "number" ? height : null,
    };
  } catch {
    return { healthy: false, latestBlock: null };
  }
}

async function showProtocolStatus(options: StatusOptions): Promise<void> {
  const json = options.json === true;
  const quiet = options.quiet === true;
  const spinner = json || quiet ? null : ora(`Querying ${apiUrl()}`).start();
  const { healthy, latestBlock } = await fetchApiStatus();
  spinner?.stop();

  if (json) {
    console.log(
      toJson({
        apiUrl: apiUrl(),
        healthy,
        latestBlock,
        contracts: contractIds(),
      }),
    );
    if (!healthy) process.exitCode = 1;
    return;
  }

  if (quiet) {
    console.log(healthy ? "ok" : "unreachable");
    if (!healthy) process.exitCode = 1;
    return;
  }

  console.log(chalk.bold("ThesisLock protocol status"));
  console.log();
  console.log(`${chalk.bold("API endpoint:")} ${apiUrl()}`);
  console.log(
    `${chalk.bold("API health:")}   ${healthy ? chalk.green("ok") : chalk.red("unreachable")}`,
  );
  console.log(
    `${chalk.bold("Latest block:")} ${latestBlock ?? chalk.dim("(unavailable)")}`,
  );
  console.log();
  console.log(`${chalk.bold("Contracts:")} ${CONTRACT_NAMES.length}`);
  for (const id of contractIds()) {
    console.log(`  ${id}`);
  }

  if (!healthy) {
    process.exitCode = 1;
  }
}

async function showPrincipalStatus(
  principal: string,
  options: StatusOptions,
): Promise<void> {
  const json = options.json === true;
  const quiet = options.quiet === true;
  const owner = principal.trim().toUpperCase();
  if (!STX_PRINCIPAL.test(owner)) {
    const message = `Invalid Stacks principal: ${principal}`;
    if (json) {
      console.log(formatError(message, true));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
    return;
  }

  const spinner =
    json || quiet ? null : ora(`Reading registry for ${owner}`).start();
  try {
    const count = await getClient().getAnchorCount(owner);
    spinner?.stop();
    if (json) {
      console.log(toJson({ principal: owner, anchors: count }));
      return;
    }
    if (quiet) {
      console.log(String(count));
      return;
    }
    console.log(`${chalk.bold("Principal:")} ${owner}`);
    console.log(`${chalk.bold("Anchors:")}   ${count}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    spinner?.fail("Registry read failed");
    if (json) {
      console.log(formatError(message, true));
    } else {
      console.error(chalk.red(message));
    }
    process.exitCode = 1;
  }
}

export async function statusCommand(
  principal?: string,
  options: StatusOptions = {},
): Promise<void> {
  if (principal) {
    await showPrincipalStatus(principal, options);
  } else {
    await showProtocolStatus(options);
  }
}
