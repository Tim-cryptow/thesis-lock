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

export interface VerifyResult {
  verified: boolean;
  source: VerifySource | null;
  data: AnchorResult | BatchAnchorResult | null;
}

export interface ThesisLockConfig {
  apiUrl?: string;
  contractAddress?: string;
  network?: "mainnet" | "testnet";
}
