import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as core from "@actions/core";
import { normalizeHash, verifyHash } from "./verify";

async function hashFile(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function resolveHash(): Promise<string> {
  const file = core.getInput("file");
  if (file) {
    core.info(`Hashing file: ${file}`);
    const digest = await hashFile(file);
    core.info(`SHA-256: ${digest}`);
    return digest;
  }

  const hashInput = core.getInput("hash");
  if (hashInput) {
    const normalized = normalizeHash(hashInput);
    if (!normalized) {
      throw new Error("Invalid hash: expected a 64-character hex SHA-256 digest");
    }
    return normalized;
  }

  throw new Error('Provide either a "hash" or a "file" input.');
}

async function run(): Promise<void> {
  try {
    const owner = core.getInput("owner") || undefined;
    const failOnUnverified = core.getBooleanInput("fail-on-unverified");

    const hash = await resolveHash();
    core.info(`Verifying hash ${hash} on Stacks...`);

    const result = await verifyHash(hash, owner);

    core.setOutput("verified", String(result.verified));
    core.setOutput("source", result.source ?? "");
    core.setOutput("block", result.block !== null ? String(result.block) : "");
    core.setOutput("label", result.label);

    if (result.verified) {
      core.info(`Verified on-chain (source: ${result.source}, block: ${result.block}).`);
      if (result.label) core.info(`Label: ${result.label}`);
      if (result.owner) core.info(`Anchored by: ${result.owner}`);
      return;
    }

    const message =
      "Hash is not anchored on-chain. Batch anchors are owner-keyed; pass the owner input if you know the anchoring wallet.";
    if (failOnUnverified) {
      core.setFailed(message);
    } else {
      core.warning(message);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

void run();
