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

const EXPLORER_BASE = "https://explorer.hiro.so";

export function explorerTxUrl(txId: string): string {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  return `${EXPLORER_BASE}/txid/${id}?chain=mainnet`;
}

export function explorerAddressUrl(principal: string): string {
  return `${EXPLORER_BASE}/address/${principal}?chain=mainnet`;
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
  const cleanHex = hash.startsWith("0x") ? hash.slice(2) : hash;
  try {
    openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: "anchor-document",
      functionArgs: [bufferCV(hexToBytes(cleanHex)), stringAsciiCV(label)],
      network: getNetwork(),
      onFinish: (data) => callbacks.onFinish(data.txId),
      // @stacks/connect routes both user cancellation and post-signature
      // failures through onCancel; an error argument distinguishes them.
      onCancel: (error?: Error) => {
        if (error) {
          callbacks.onError?.(
            error.message || "The transaction could not be submitted.",
          );
        } else {
          callbacks.onCancel?.();
        }
      },
    });
  } catch (e) {
    callbacks.onError?.(
      e instanceof Error ? e.message : "Could not open your wallet.",
    );
  }
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
