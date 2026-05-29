import {
  bufferCV,
  cvToValue,
  deserializeCV,
  principalCV,
  serializeCV,
} from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";

const HIRO_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT_NAME = "thesislock-batch";

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export type FetchedAnchor = {
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
  label: string;
};

export type FetchedBatchAnchor = {
  label: string;
  stacksBlock: number;
  burnBlock: number;
  batchId: number;
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function withHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

async function callReadOnly(
  contract: string,
  fn: string,
  args: string[],
): Promise<unknown> {
  const url = `${HIRO_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${contract}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: CONTRACT_ADDRESS,
      arguments: args.map(withHexPrefix),
    }),
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { okay?: boolean; result?: string };
  if (!data.okay || !data.result) return null;
  const cv = deserializeCV(data.result);
  return cvToValue(cv, true);
}

export async function fetchAnchor(
  hash: string,
): Promise<FetchedAnchor | null> {
  if (!HEX_64.test(hash)) return null;
  const hashArg = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const value = await callReadOnly(CONTRACT_NAME, "get-anchor", [hashArg]);
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    anchoredBy: String(v["anchored-by"]),
    stacksBlock: Number(v["stacks-block"]),
    burnBlock: Number(v["burn-block"]),
    label: String(v["label"] ?? ""),
  };
}

export async function fetchBatchAnchor(
  hash: string,
  owner: string,
): Promise<FetchedBatchAnchor | null> {
  if (!HEX_64.test(hash)) return null;
  if (!STX_PRINCIPAL.test(owner)) return null;
  const hashArg = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const ownerArg = serializeCV(principalCV(owner));
  const value = await callReadOnly(BATCH_CONTRACT_NAME, "get-batch-anchor", [
    hashArg,
    ownerArg,
  ]);
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    label: String(v["label"] ?? ""),
    stacksBlock: Number(v["stacks-block"]),
    burnBlock: Number(v["burn-block"]),
    batchId: Number(v["batch-id"]),
  };
}
