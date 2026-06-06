import {
  cvToValue,
  deserializeCV,
  principalCV,
  serializeCV,
  uintCV,
  validateStacksAddress,
} from "@stacks/transactions";
import { serializeHash } from "./utils";
import type {
  AnchorResult,
  BatchAnchorResult,
  BatchVerifyResult,
  ProofNFT,
  RegistryEntry,
  SingleVerifyResult,
  ThesisLockConfig,
  VerifyResult,
} from "./types";

const DEFAULT_API_URL = "https://api.mainnet.hiro.so";
const DEFAULT_CONTRACT_ADDRESS = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";
const PROOF_CONTRACT = "thesislock-proof";

function withHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

function stripHex(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

// cvToValue may return a plain tuple ({ "stacks-block": 123 }) or the verbose
// Clarity form ({ value: { "stacks-block": { value: "123" } } }) depending on
// the @stacks/transactions version. These helpers read either shape.
function tupleFields(value: unknown): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "object"
  ) {
    return (value as { value: Record<string, unknown> }).value;
  }
  return value as Record<string, unknown>;
}

function fieldValue(field: unknown): unknown {
  if (field && typeof field === "object" && "value" in field) {
    return (field as { value: unknown }).value;
  }
  return field;
}

export class ThesisLockClient {
  readonly apiUrl: string;
  readonly contractAddress: string;
  readonly network: "mainnet" | "testnet";

  constructor(config: ThesisLockConfig = {}) {
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.contractAddress = config.contractAddress ?? DEFAULT_CONTRACT_ADDRESS;
    this.network = config.network ?? "mainnet";
  }

  private async callReadOnly(
    contract: string,
    fn: string,
    args: string[],
  ): Promise<unknown> {
    const url = `${this.apiUrl}/v2/contracts/call-read/${this.contractAddress}/${contract}/${fn}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: this.contractAddress,
        arguments: args.map(withHexPrefix),
      }),
    });
    if (!res.ok) {
      throw new Error(`Hiro read-only call failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { okay?: boolean; result?: string; cause?: string };
    if (!data.okay || !data.result) {
      throw new Error(`Contract call rejected: ${data.cause ?? "unknown error"}`);
    }
    return cvToValue(deserializeCV(data.result), true);
  }

  /** Look up a single anchor in the thesislock contract. */
  async verify(hash: string): Promise<SingleVerifyResult> {
    const value = await this.callReadOnly(SINGLE_CONTRACT, "get-anchor", [
      serializeHash(hash),
    ]);
    if (value === null || value === undefined) {
      return { verified: false, source: null, data: null };
    }
    const v = tupleFields(value);
    const data: AnchorResult = {
      hash: stripHex(hash).toLowerCase(),
      label: String(fieldValue(v["label"]) ?? ""),
      anchoredBy: String(fieldValue(v["anchored-by"]) ?? ""),
      stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
      burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
    };
    return { verified: true, source: "single", data };
  }

  /** Look up an owner-keyed batch anchor in the thesislock-batch contract. */
  async verifyBatch(hash: string, owner: string): Promise<BatchVerifyResult> {
    if (!validateStacksAddress(owner)) {
      throw new Error(`Invalid Stacks principal: ${owner}`);
    }
    const value = await this.callReadOnly(BATCH_CONTRACT, "get-batch-anchor", [
      serializeHash(hash),
      serializeCV(principalCV(owner)),
    ]);
    if (value === null || value === undefined) {
      return { verified: false, source: null, data: null };
    }
    const v = tupleFields(value);
    const data: BatchAnchorResult = {
      hash: stripHex(hash).toLowerCase(),
      owner,
      label: String(fieldValue(v["label"]) ?? ""),
      stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
      burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
      batchId: Number(fieldValue(v["batch-id"]) ?? 0),
    };
    return { verified: true, source: "batch", data };
  }

  /**
   * Tries the single anchor first, then the owner-keyed batch anchor when an
   * owner is supplied. Returns the first match, or an unverified result.
   */
  async verifyAny(hash: string, owner?: string): Promise<VerifyResult> {
    const single = await this.verify(hash);
    if (single.verified) return single;
    if (owner) {
      return this.verifyBatch(hash, owner);
    }
    return { verified: false, source: null, data: null };
  }

  /** Number of anchors a principal has registered in the registry contract. */
  async getAnchorCount(owner: string): Promise<number> {
    if (!validateStacksAddress(owner)) {
      throw new Error(`Invalid Stacks principal: ${owner}`);
    }
    const value = await this.callReadOnly(REGISTRY_CONTRACT, "get-anchor-count", [
      serializeCV(principalCV(owner)),
    ]);
    return Number(fieldValue(value) ?? 0);
  }

  /** Up to the ten most recent anchors a principal registered, newest first. */
  async getRecentAnchors(owner: string): Promise<RegistryEntry[]> {
    if (!validateStacksAddress(owner)) {
      throw new Error(`Invalid Stacks principal: ${owner}`);
    }
    const value = await this.callReadOnly(
      REGISTRY_CONTRACT,
      "get-recent-anchors",
      [serializeCV(principalCV(owner))],
    );
    if (!Array.isArray(value)) return [];
    const entries: RegistryEntry[] = [];
    for (const item of value) {
      if (item === null || item === undefined) continue;
      const v = tupleFields(item);
      entries.push({
        hash: stripHex(String(fieldValue(v["hash"]) ?? "")).toLowerCase(),
        label: String(fieldValue(v["label"]) ?? ""),
        anchoredAt: Number(fieldValue(v["anchored-at"]) ?? 0),
      });
    }
    return entries;
  }

  /** Read a proof NFT by token id from the thesislock-proof contract. */
  async getProof(tokenId: number): Promise<ProofNFT | null> {
    if (!Number.isInteger(tokenId) || tokenId < 0) {
      throw new Error(`Invalid token id: ${tokenId}`);
    }
    const value = await this.callReadOnly(PROOF_CONTRACT, "get-proof", [
      serializeCV(uintCV(tokenId)),
    ]);
    if (value === null || value === undefined) return null;
    const v = tupleFields(value);
    return {
      tokenId,
      hash: stripHex(String(fieldValue(v["hash"]) ?? "")).toLowerCase(),
      label: String(fieldValue(v["label"]) ?? ""),
      anchoredBy: String(fieldValue(v["anchored-by"]) ?? ""),
      stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
      burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
    };
  }

  /** Resolve a proof NFT from the hash it anchors. */
  async getProofByHash(hash: string): Promise<ProofNFT | null> {
    const idValue = await this.callReadOnly(
      PROOF_CONTRACT,
      "get-token-id-by-hash",
      [serializeHash(hash)],
    );
    if (idValue === null || idValue === undefined) return null;
    const tokenId = Number(fieldValue(idValue));
    return this.getProof(tokenId);
  }
}
