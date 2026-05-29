import { bufferCV, cvToValue, deserializeCV, serializeCV } from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";

const HIRO_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

export type FetchedAnchor = {
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
  label: string;
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

export async function fetchAnchor(
  hash: string,
): Promise<FetchedAnchor | null> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;

  const argHex = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const url = `${HIRO_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-anchor`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: CONTRACT_ADDRESS,
      arguments: [argHex.startsWith("0x") ? argHex : `0x${argHex}`],
    }),
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { okay?: boolean; result?: string };
  if (!data.okay || !data.result) return null;

  const cv = deserializeCV(data.result);
  const value = cvToValue(cv, true);
  if (value === null || value === undefined) return null;

  return {
    anchoredBy: String(value["anchored-by"]),
    stacksBlock: Number(value["stacks-block"]),
    burnBlock: Number(value["burn-block"]),
    label: String(value["label"] ?? ""),
  };
}
