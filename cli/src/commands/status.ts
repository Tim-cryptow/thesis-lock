import chalk from "chalk";
import ora from "ora";
import { apiUrl, CONTRACT_ADDRESS, CONTRACT_NAMES, getClient } from "../index";

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

type ApiStatus = {
  status?: string;
  chain_tip?: { block_height?: number };
};

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

async function showProtocolStatus(): Promise<void> {
  const spinner = ora(`Querying ${apiUrl()}`).start();
  const { healthy, latestBlock } = await fetchApiStatus();
  spinner.stop();

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
  for (const name of CONTRACT_NAMES) {
    console.log(`  ${CONTRACT_ADDRESS}.${name}`);
  }

  if (!healthy) {
    process.exitCode = 1;
  }
}

async function showPrincipalStatus(principal: string): Promise<void> {
  const owner = principal.trim().toUpperCase();
  if (!STX_PRINCIPAL.test(owner)) {
    console.error(chalk.red(`Invalid Stacks principal: ${principal}`));
    process.exitCode = 1;
    return;
  }

  const spinner = ora(`Reading registry for ${owner}`).start();
  try {
    const count = await getClient().getAnchorCount(owner);
    spinner.stop();
    console.log(`${chalk.bold("Principal:")} ${owner}`);
    console.log(`${chalk.bold("Anchors:")}   ${count}`);
  } catch (err) {
    spinner.fail("Registry read failed");
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  }
}

export async function statusCommand(principal?: string): Promise<void> {
  if (principal) {
    await showPrincipalStatus(principal);
  } else {
    await showProtocolStatus();
  }
}
