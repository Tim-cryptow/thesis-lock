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
import { fetchWithRetry } from "./fetchWithRetry";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME!;
const BATCH_CONTRACT_NAME = "thesislock-batch";
const REGISTRY_CONTRACT_NAME = "thesislock-registry";
const PROOF_CONTRACT_NAME = "thesislock-proof";
const GROUPS_CONTRACT_NAME = "thesislock-groups";

export const SINGLE_CONTRACT_NAME = CONTRACT_NAME;
export const BATCH_CONTRACT_FULL_NAME = BATCH_CONTRACT_NAME;
export const PROOF_CONTRACT_FULL_NAME = PROOF_CONTRACT_NAME;
export const GROUPS_CONTRACT_FULL_NAME = GROUPS_CONTRACT_NAME;
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

export type Proof = {
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
};

export type ProofWithId = Proof & { tokenId: number };

export type Group = {
  name: string;
  admin: string;
  createdAt: number;
};

export type GroupAnchor = {
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
};

export function getNetwork(): StacksNetwork {
  // Injecting fetchWithRetry as the client's fetch means every read-only
  // contract call retries transient Hiro failures with exponential backoff.
  return {
    ...STACKS_MAINNET,
    client: { baseUrl: API_URL, fetch: fetchWithRetry },
  };
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

export function mintProof(
  hash: string,
  label: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: PROOF_CONTRACT_NAME,
    functionName: "mint-proof",
    functionArgs: [bufferCV(hexToBytes(stripHex(hash))), stringAsciiCV(label)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

function decodeProof(value: unknown): Proof | null {
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    hash: stripHex(String(v["hash"] ?? "")),
    label: String(v["label"] ?? ""),
    anchoredBy: String(v["anchored-by"] ?? ""),
    stacksBlock: Number(v["stacks-block"]),
    burnBlock: Number(v["burn-block"]),
  };
}

export async function getProof(tokenId: number): Promise<Proof | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: PROOF_CONTRACT_NAME,
    functionName: "get-proof",
    functionArgs: [uintCV(tokenId)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return decodeProof(cvToValue(result, true));
}

export async function getProofByHash(
  hash: string,
): Promise<ProofWithId | null> {
  const idResult: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: PROOF_CONTRACT_NAME,
    functionName: "get-token-id-by-hash",
    functionArgs: [bufferCV(hexToBytes(stripHex(hash)))],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  const idValue = cvToValue(idResult, true);
  if (idValue === null || idValue === undefined) return null;
  const tokenId = Number(idValue);
  const proof = await getProof(tokenId);
  if (!proof) return null;
  return { tokenId, ...proof };
}

// get-last-token-id returns a (response uint uint); cvToValue wraps an ok
// response as { type: "ok", value }, so unwrap before coercing.
export async function getLastTokenId(): Promise<number> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: PROOF_CONTRACT_NAME,
    functionName: "get-last-token-id",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  const value = cvToValue(result, true);
  if (value && typeof value === "object" && "value" in value) {
    return Number((value as { value: unknown }).value);
  }
  return Number(value);
}

export function createGroup(
  name: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "create-group",
    functionArgs: [stringAsciiCV(name)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export function addMember(
  groupId: number,
  member: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "add-member",
    functionArgs: [uintCV(groupId), principalCV(member)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export function removeMember(
  groupId: number,
  member: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "remove-member",
    functionArgs: [uintCV(groupId), principalCV(member)],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export function anchorToGroup(
  groupId: number,
  hash: string,
  label: string,
  onFinish: (txId: string) => void,
  onCancel?: () => void,
): void {
  openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "anchor-to-group",
    functionArgs: [
      uintCV(groupId),
      bufferCV(hexToBytes(stripHex(hash))),
      stringAsciiCV(label),
    ],
    network: getNetwork(),
    onFinish: (data) => onFinish(data.txId),
    onCancel: () => onCancel?.(),
  });
}

export async function getGroup(groupId: number): Promise<Group | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "get-group",
    functionArgs: [uintCV(groupId)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  const value = cvToValue(result, true);
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    name: String(v["name"] ?? ""),
    admin: String(v["admin"] ?? ""),
    createdAt: Number(v["created-at"]),
  };
}

export async function isMember(
  groupId: number,
  who: string,
): Promise<boolean> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "is-member",
    functionArgs: [uintCV(groupId), principalCV(who)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return Boolean(cvToValue(result, true));
}

export async function getGroupAnchorCount(groupId: number): Promise<number> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "get-group-anchor-count",
    functionArgs: [uintCV(groupId)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return Number(cvToValue(result, true));
}

function decodeGroupAnchor(value: unknown): GroupAnchor | null {
  if (value === null || value === undefined) return null;
  const v = value as Record<string, unknown>;
  return {
    hash: stripHex(String(v["hash"] ?? "")),
    label: String(v["label"] ?? ""),
    anchoredBy: String(v["anchored-by"] ?? ""),
    stacksBlock: Number(v["stacks-block"]),
  };
}

export async function getGroupAnchorAt(
  groupId: number,
  index: number,
): Promise<GroupAnchor | null> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "get-group-anchor-at",
    functionArgs: [uintCV(groupId), uintCV(index)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  return decodeGroupAnchor(cvToValue(result, true));
}

export async function getRecentGroupAnchors(
  groupId: number,
): Promise<Array<GroupAnchor | null>> {
  const result: ClarityValue = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: GROUPS_CONTRACT_NAME,
    functionName: "get-recent-group-anchors",
    functionArgs: [uintCV(groupId)],
    senderAddress: CONTRACT_ADDRESS,
    network: getNetwork(),
  });
  const value = cvToValue(result, true);
  if (!Array.isArray(value)) return [];
  return value.map((entry) => decodeGroupAnchor(entry));
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
