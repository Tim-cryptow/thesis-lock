// On-chain record shapes returned by the ThesisLock contracts, normalized
// into plain JavaScript values.

export interface AnchorResult {
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
}

export interface BatchAnchorResult {
  hash: string;
  owner: string;
  label: string;
  stacksBlock: number;
  burnBlock: number;
  batchId: number;
}

export interface RegistryEntry {
  hash: string;
  label: string;
  anchoredAt: number;
}

export interface ProofNFT {
  tokenId: number;
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
}

export type VerifySource = "single" | "batch" | "proof";

export interface UnverifiedResult {
  verified: false;
  source: null;
  data: null;
}

export type SingleVerifyResult =
  | { verified: true; source: "single"; data: AnchorResult }
  | UnverifiedResult;

export type BatchVerifyResult =
  | { verified: true; source: "batch"; data: BatchAnchorResult }
  | UnverifiedResult;

// Discriminated on `verified` and `source` so consumers can narrow `data`
// after checking `result.verified`.
export type VerifyResult =
  | { verified: true; source: "single"; data: AnchorResult }
  | { verified: true; source: "batch"; data: BatchAnchorResult }
  | UnverifiedResult;

export interface ThesisLockConfig {
  apiUrl?: string;
  contractAddress?: string;
  network?: "mainnet" | "testnet";
}
