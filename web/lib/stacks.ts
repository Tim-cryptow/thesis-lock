import { STACKS_MAINNET, type StacksNetwork } from "@stacks/network";
import {
  bufferCV,
  cvToValue,
  fetchCallReadOnlyFunction,
  listCV,
  principalCV,
  stringAsciiCV,
  tupleCV,
  uintCV,
  type ClarityValue,
} from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";
import { openContractCall } from "@stacks/connect";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME!;
const BATCH_CONTRACT_NAME = "thesislock-batch";
const REGISTRY_CONTRACT_NAME = "thesislock-registry";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export type Anchor = {
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
  label: string;
};

export type BatchAnchor = {
  label: string;
  stacksBlock: number;
  burnBlock: number;
  batchId: number;
};

export type RegistryEntry = {
  hash: string;
  label: string;
  anchoredAt: number;
};

export function getNetwork(): StacksNetwork {
  return { ...STACKS_MAINNET, client: { baseUrl: API_URL } };
}

export function explorerAddressUrl(principal: string): string {
  return `https://explorer.hiro.so/address/${principal}?chain=mainnet`;
}

export function explorerTxUrl(txId: string): string {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  return `https://explorer.hiro.so/txid/${id}?chain=mainnet`;
}

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

export async function readAnchor(hash: string): Promise<Anchor | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-anchor",
    functionArgs: [bufferCV(hexToBytes(stripHex(hash)))],
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

export type SubmitAnchorCallbacks = {
  onFinish: (txId: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

export function submitAnchor(
  hash: string,
  label: string,
  callbacks: SubmitAnchorCallbacks,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "anchor-document",
    functionArgs: [bufferCV(hexToBytes(stripHex(hash))), stringAsciiCV(label)],
    network: getNetwork(),
    onFinish: (data) => callbacks.onFinish(data.txId),
    onCancel: () => callbacks.onCancel?.(),
  });
}

export function submitBatchAnchor(
  entries: Array<{ hash: string; label: string }>,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  const entriesCV = listCV(
    entries.map((e) =>
      tupleCV({
        hash: bufferCV(hexToBytes(stripHex(e.hash))),
        label: stringAsciiCV(e.label),
      }),
    ),
  );
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: BATCH_CONTRACT_NAME,
    functionName: "anchor-batch",
    functionArgs: [entriesCV],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export async function readBatchAnchor(
  hash: string,
  owner: string,
): Promise<BatchAnchor | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: BATCH_CONTRACT_NAME,
    functionName: "get-batch-anchor",
    functionArgs: [
      bufferCV(hexToBytes(stripHex(hash))),
      principalCV(owner),
    ],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });

  const value = cvToValue(result, true);
  if (value === null || value === undefined) {
    return null;
  }

  return {
    label: String(value["label"] ?? ""),
    stacksBlock: Number(value["stacks-block"]),
    burnBlock: Number(value["burn-block"]),
    batchId: Number(value["batch-id"]),
  };
}

export function registerAnchor(
  hash: string,
  label: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: REGISTRY_CONTRACT_NAME,
    functionName: "register-anchor",
    functionArgs: [bufferCV(hexToBytes(stripHex(hash))), stringAsciiCV(label)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export async function getAnchorCount(owner: string): Promise<number> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: REGISTRY_CONTRACT_NAME,
    functionName: "get-anchor-count",
    functionArgs: [principalCV(owner)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return Number(cvToValue(result, true));
}

function decodeRegistryEntry(value: unknown): RegistryEntry | null {
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    hash: stripHex(String(v["hash"] ?? "")),
    label: String(v["label"] ?? ""),
    anchoredAt: Number(v["anchored-at"]),
  };
}

export async function getAnchorAt(
  owner: string,
  index: number,
): Promise<RegistryEntry | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: REGISTRY_CONTRACT_NAME,
    functionName: "get-anchor-at",
    functionArgs: [principalCV(owner), uintCV(index)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return decodeRegistryEntry(cvToValue(result, true));
}

export async function getRecentAnchors(
  owner: string,
): Promise<Array<RegistryEntry | null>> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: REGISTRY_CONTRACT_NAME,
    functionName: "get-recent-anchors",
    functionArgs: [principalCV(owner)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  const value = cvToValue(result, true);
  if (!Array.isArray(value)) return [];
  return value.map((entry) => decodeRegistryEntry(entry));
}

export async function hashFile(file: File): Promise<string> {
  // crypto.subtle is only exposed in secure contexts (HTTPS or localhost).
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Hashing requires a secure context. Open this page over HTTPS and try again.",
    );
  }
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
