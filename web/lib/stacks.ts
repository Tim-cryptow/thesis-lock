import { STACKS_MAINNET, type StacksNetwork } from "@stacks/network";
import {
  bufferCV,
  cvToValue,
  fetchCallReadOnlyFunction,
  stringAsciiCV,
  type ClarityValue,
} from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";
import { openContractCall } from "@stacks/connect";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export type Anchor = {
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
  label: string;
};

export function getNetwork(): StacksNetwork {
  return { ...STACKS_MAINNET, client: { baseUrl: API_URL } };
}

export async function readAnchor(hash: string): Promise<Anchor | null> {
  const cleanHex = hash.startsWith("0x") ? hash.slice(2) : hash;
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-anchor",
    functionArgs: [bufferCV(hexToBytes(cleanHex))],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });

  const value = cvToValue(result, true);
  if (value === null || value === undefined) {
    return null;
  }

  return {
    anchoredBy: String(value["anchored-by"]),
    stacksBlock: Number(value["stacks-block"]),
    burnBlock: Number(value["burn-block"]),
    label: String(value["label"] ?? ""),
  };
}

export function submitAnchor(
  hash: string,
  label: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  const cleanHex = hash.startsWith("0x") ? hash.slice(2) : hash;
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "anchor-document",
    functionArgs: [bufferCV(hexToBytes(cleanHex)), stringAsciiCV(label)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
