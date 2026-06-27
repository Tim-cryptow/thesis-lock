// Contract explorer registry and helpers. ThesisLock is five Clarity 3
// contracts deployed under one mainnet principal. This module hardcodes their
// public surface (functions, maps, data variables, deploy metadata) so the
// explorer page can render a self-documenting view, and exposes helpers to
// fetch recent calls and invoke read-only functions through the Hiro API.

import {
  bufferCV,
  cvToJSON,
  cvToValue,
  deserializeCV,
  noneCV,
  principalCV,
  serializeCV,
  someCV,
  stringAsciiCV,
  uintCV,
  type ClarityValue,
} from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";

const HIRO_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

export const EXPLORER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

export type FunctionAccess = "public" | "read-only" | "private";

export type FunctionArg = {
  name: string;
  type: string;
};

export type FunctionInfo = {
  name: string;
  access: FunctionAccess;
  args: FunctionArg[];
  returnType: string;
  description: string;
};

export type ContractInfo = {
  name: string;
  address: string;
  deployTx: string;
  deployBlock: number;
  functions: FunctionInfo[];
  maps: string[];
  variables: string[];
  // Total on-chain calls. Populated at fetch time from the Hiro API; the static
  // registry seeds it with 0.
  totalCalls: number;
};

export type ContractCall = {
  txId: string;
  function: string;
  sender: string;
  block: number;
  status: string;
  timestamp: string;
};

// Short, plain-language summary shown in the sidebar and overview cards.
export const CONTRACT_BLURBS: Record<string, string> = {
  thesislock: "Core single-hash anchor. One immutable record per document hash.",
  "thesislock-batch": "Anchor up to ten hashes in a single transaction.",
  "thesislock-registry": "Per-wallet append-only index powering anchor history.",
  "thesislock-proof": "Soulbound SIP-009 proof tokens minted per anchored hash.",
  "thesislock-groups": "Named groups for collaborative, shared anchor history.",
};

// The full registry, in deploy order. Deploy tx and block are the canonical
// mainnet publish transactions. Private helper functions are intentionally
// omitted: they are internal and not callable or readable from outside.
export const CONTRACT_REGISTRY: ContractInfo[] = [
  {
    name: "thesislock",
    address: EXPLORER_CONTRACT_ADDRESS,
    deployTx: "0xd1bdda30d03befb0023c9e1c34e71a7429d5f1b699424f60481b3a64df8f5d8e",
    deployBlock: 7798720,
    maps: ["anchors"],
    variables: [],
    totalCalls: 0,
    functions: [
      {
        name: "anchor-document",
        access: "public",
        args: [
          { name: "hash", type: "(buff 32)" },
          { name: "label", type: "(string-ascii 64)" },
        ],
        returnType: "(response bool uint)",
        description:
          "Anchor a SHA-256 hash with an optional label. Fails with u100 if the hash is already anchored.",
      },
      {
        name: "get-anchor",
        access: "read-only",
        args: [{ name: "hash", type: "(buff 32)" }],
        returnType:
          "(optional { anchored-by: principal, stacks-block: uint, burn-block: uint, label: (string-ascii 64) })",
        description:
          "Return the full anchor record for a hash, or none if it has never been anchored.",
      },
      {
        name: "is-anchored",
        access: "read-only",
        args: [{ name: "hash", type: "(buff 32)" }],
        returnType: "bool",
        description: "Cheap boolean check of whether a hash has been anchored.",
      },
    ],
  },
  {
    name: "thesislock-batch",
    address: EXPLORER_CONTRACT_ADDRESS,
    deployTx: "0xfb395a494ea378e83de4f19359ced3bb2288d3ccb200f058959c72b66ce7c99f",
    deployBlock: 8104735,
    maps: ["batch-anchors"],
    variables: ["batch-counter"],
    totalCalls: 0,
    functions: [
      {
        name: "anchor-batch",
        access: "public",
        args: [
          {
            name: "entries",
            type: "(list 10 { hash: (buff 32), label: (string-ascii 64) })",
          },
        ],
        returnType: "(response uint uint)",
        description:
          "Anchor up to ten hashes in one transaction, keyed by hash and owner. Returns the new batch id. Duplicate hashes for the same owner are silently skipped.",
      },
      {
        name: "get-batch-anchor",
        access: "read-only",
        args: [
          { name: "hash", type: "(buff 32)" },
          { name: "owner", type: "principal" },
        ],
        returnType:
          "(optional { label: (string-ascii 64), stacks-block: uint, burn-block: uint, batch-id: uint })",
        description: "Return a batch anchor record for a given hash and owner, or none.",
      },
      {
        name: "get-batch-count",
        access: "read-only",
        args: [],
        returnType: "uint",
        description: "Total number of batches anchored across all owners.",
      },
    ],
  },
  {
    name: "thesislock-registry",
    address: EXPLORER_CONTRACT_ADDRESS,
    deployTx: "0xb3acf2043c04c02431e240398686e69fed925226594ec18a53702ec61a6b303a",
    deployBlock: 8104735,
    maps: ["anchor-index", "anchor-count"],
    variables: [],
    totalCalls: 0,
    functions: [
      {
        name: "register-anchor",
        access: "public",
        args: [
          { name: "hash", type: "(buff 32)" },
          { name: "label", type: "(string-ascii 64)" },
        ],
        returnType: "(response uint uint)",
        description: "Append an anchor to the caller's index and return its zero-based position.",
      },
      {
        name: "get-anchor-count",
        access: "read-only",
        args: [{ name: "owner", type: "principal" }],
        returnType: "uint",
        description: "Number of anchors registered by a principal.",
      },
      {
        name: "get-anchor-at",
        access: "read-only",
        args: [
          { name: "owner", type: "principal" },
          { name: "index", type: "uint" },
        ],
        returnType: "(optional { hash: (buff 32), label: (string-ascii 64), anchored-at: uint })",
        description: "Return the anchor at a given index for a principal.",
      },
      {
        name: "get-recent-anchors",
        access: "read-only",
        args: [{ name: "owner", type: "principal" }],
        returnType: "(list 10 (optional { hash, label, anchored-at }))",
        description: "Return up to the ten most recent anchors for a principal, newest first.",
      },
    ],
  },
  {
    name: "thesislock-proof",
    address: EXPLORER_CONTRACT_ADDRESS,
    deployTx: "0x0a249e7bbdc3d6a4c5b969ec4a7dadb6759e2726a10f706ba628197ed76a7c34",
    deployBlock: 8135493,
    maps: ["proof-data", "hash-to-token"],
    variables: ["last-token-id"],
    totalCalls: 0,
    functions: [
      {
        name: "mint-proof",
        access: "public",
        args: [
          { name: "hash", type: "(buff 32)" },
          { name: "label", type: "(string-ascii 64)" },
        ],
        returnType: "(response uint uint)",
        description:
          "Anchor a hash and mint a soulbound proof token to the caller. Fails with u409 if the hash already backs a token.",
      },
      {
        name: "transfer",
        access: "public",
        args: [
          { name: "token-id", type: "uint" },
          { name: "sender", type: "principal" },
          { name: "recipient", type: "principal" },
        ],
        returnType: "(response bool uint)",
        description:
          "SIP-009 transfer. Always fails with u401: proof tokens are soulbound and cannot move.",
      },
      {
        name: "get-last-token-id",
        access: "read-only",
        args: [],
        returnType: "(response uint uint)",
        description: "Highest minted token id (SIP-009).",
      },
      {
        name: "get-token-uri",
        access: "read-only",
        args: [{ name: "token-id", type: "uint" }],
        returnType: "(response (optional (string-ascii 256)) uint)",
        description: "Metadata URI for a token (SIP-009).",
      },
      {
        name: "get-owner",
        access: "read-only",
        args: [{ name: "token-id", type: "uint" }],
        returnType: "(response (optional principal) uint)",
        description: "Current owner of a token (SIP-009).",
      },
      {
        name: "get-proof",
        access: "read-only",
        args: [{ name: "token-id", type: "uint" }],
        returnType:
          "(optional { hash: (buff 32), label: (string-ascii 64), anchored-by: principal, stacks-block: uint, burn-block: uint })",
        description: "Return the anchor record backing a token id.",
      },
      {
        name: "get-token-id-by-hash",
        access: "read-only",
        args: [{ name: "hash", type: "(buff 32)" }],
        returnType: "(optional uint)",
        description: "Resolve the token id minted for a hash, or none.",
      },
      {
        name: "get-proof-by-hash",
        access: "read-only",
        args: [{ name: "hash", type: "(buff 32)" }],
        returnType: "(optional { hash, label, anchored-by, stacks-block, burn-block })",
        description: "Return the anchor record for a hash via its token, or none.",
      },
    ],
  },
  {
    name: "thesislock-groups",
    address: EXPLORER_CONTRACT_ADDRESS,
    deployTx: "0x4a698fca849d4c0ea7e28d020ab45ef1846c0e9fea39e128f3b48632473cd89a",
    deployBlock: 8212734,
    maps: ["groups", "group-members", "group-anchors", "group-anchor-count"],
    variables: ["group-counter"],
    totalCalls: 0,
    functions: [
      {
        name: "create-group",
        access: "public",
        args: [{ name: "name", type: "(string-ascii 64)" }],
        returnType: "(response uint uint)",
        description:
          "Create a named group with the caller as admin and first member. Returns the new group id.",
      },
      {
        name: "add-member",
        access: "public",
        args: [
          { name: "group-id", type: "uint" },
          { name: "member", type: "principal" },
        ],
        returnType: "(response bool uint)",
        description: "Admin-only. Add a member to a group. Fails with u403 otherwise.",
      },
      {
        name: "remove-member",
        access: "public",
        args: [
          { name: "group-id", type: "uint" },
          { name: "member", type: "principal" },
        ],
        returnType: "(response bool uint)",
        description:
          "Admin-only. Remove a member from a group. The admin cannot remove themselves (u400).",
      },
      {
        name: "anchor-to-group",
        access: "public",
        args: [
          { name: "group-id", type: "uint" },
          { name: "hash", type: "(buff 32)" },
          { name: "label", type: "(string-ascii 64)" },
        ],
        returnType: "(response uint uint)",
        description:
          "Members-only. Append a hash to the group's shared history and return its index. Fails with u403 for non-members.",
      },
      {
        name: "get-group",
        access: "read-only",
        args: [{ name: "group-id", type: "uint" }],
        returnType: "(optional { name: (string-ascii 64), admin: principal, created-at: uint })",
        description: "Return a group's name, admin, and creation block.",
      },
      {
        name: "is-member",
        access: "read-only",
        args: [
          { name: "group-id", type: "uint" },
          { name: "who", type: "principal" },
        ],
        returnType: "bool",
        description: "Whether a principal is a member of a group.",
      },
      {
        name: "get-group-anchor-count",
        access: "read-only",
        args: [{ name: "group-id", type: "uint" }],
        returnType: "uint",
        description: "Number of anchors in a group's shared history.",
      },
      {
        name: "get-group-anchor-at",
        access: "read-only",
        args: [
          { name: "group-id", type: "uint" },
          { name: "index", type: "uint" },
        ],
        returnType:
          "(optional { hash: (buff 32), label: (string-ascii 64), anchored-by: principal, stacks-block: uint })",
        description: "Return the anchor at a given index in a group.",
      },
      {
        name: "get-recent-group-anchors",
        access: "read-only",
        args: [{ name: "group-id", type: "uint" }],
        returnType: "(list 10 (optional { hash, label, anchored-by, stacks-block }))",
        description: "Return up to the ten most recent anchors in a group, newest first.",
      },
    ],
  },
];

export function getContract(name: string): ContractInfo | undefined {
  return CONTRACT_REGISTRY.find((c) => c.name === name);
}

export function getReadOnlyFunctions(contract: ContractInfo): FunctionInfo[] {
  return contract.functions.filter((f) => f.access === "read-only");
}

export function getPublicFunctions(contract: ContractInfo): FunctionInfo[] {
  return contract.functions.filter((f) => f.access === "public");
}

// Render a Clarity-style signature line for a function, e.g.
//   (get-anchor (hash (buff 32)))
export function functionSignature(fn: FunctionInfo): string {
  const args = fn.args.map((a) => `(${a.name} ${a.type})`).join(" ");
  return args ? `(${fn.name} ${args})` : `(${fn.name})`;
}

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

// Serialize a single raw argument into a Clarity value based on its declared
// type. Used by both the read-only tester and the API proxy so encoding lives
// in one place. For (optional X), pass null/undefined/"" to send none.
export function argToClarityValue(type: string, raw: unknown): ClarityValue {
  const t = type.trim();

  const optionalMatch = t.match(/^\(optional\s+(.+)\)$/);
  if (optionalMatch) {
    if (raw === null || raw === undefined || raw === "") return noneCV();
    return someCV(argToClarityValue(optionalMatch[1], raw));
  }

  if (t === "uint") {
    const n = typeof raw === "bigint" ? raw : BigInt(String(raw).trim());
    if (n < BigInt(0)) throw new Error("uint cannot be negative");
    return uintCV(n);
  }

  if (t === "principal") {
    return principalCV(String(raw).trim());
  }

  if (t.startsWith("(buff")) {
    const hex = stripHex(String(raw).trim().toLowerCase());
    if (!/^[0-9a-f]*$/.test(hex)) throw new Error("Buffer must be hex");
    return bufferCV(hexToBytes(hex));
  }

  if (t.startsWith("(string-ascii")) {
    return stringAsciiCV(String(raw));
  }

  throw new Error(`Unsupported argument type: ${type}`);
}

function withHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

// Shape of a transaction in the Hiro extended transactions response we read.
type HiroTx = {
  tx_id?: string;
  tx_type?: string;
  tx_status?: string;
  sender_address?: string;
  block_height?: number;
  burn_block_time_iso?: string;
  block_time_iso?: string;
  contract_call?: { function_name?: string };
};

// Thrown when the Hiro API itself fails (a rejected fetch or a non-2xx
// response), as opposed to a client/validation error. Lets callers map upstream
// failures to a 502 and surface a retryable state rather than caching a false
// empty result.
export class ExplorerUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplorerUpstreamError";
  }
}

// Fetch recent contract-call transactions for a contract from the Hiro
// extended API, newest first. The endpoint returns every transaction touching
// the contract address (including its deploy); we keep only contract calls.
// Throws ExplorerUpstreamError on a Hiro failure so callers don't mistake an
// outage for "no recent calls".
export async function fetchContractCalls(
  contractName: string,
  limit = 20,
): Promise<ContractCall[]> {
  const contractId = `${EXPLORER_CONTRACT_ADDRESS}.${contractName}`;
  // Over-fetch a little so we still surface `limit` calls after dropping the
  // deploy and any non-call transactions.
  const fetchLimit = Math.min(50, limit + 5);
  const url = `${HIRO_BASE}/extended/v1/address/${contractId}/transactions?limit=${fetchLimit}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new ExplorerUpstreamError(`Hiro API returned ${res.status}`);
  }
  const data = (await res.json()) as { results?: HiroTx[] };
  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .filter((tx) => tx.tx_type === "contract_call")
    .slice(0, limit)
    .map((tx) => ({
      txId: tx.tx_id ?? "",
      function: tx.contract_call?.function_name ?? "",
      sender: tx.sender_address ?? "",
      block: Number(tx.block_height ?? 0),
      status: tx.tx_status ?? "",
      timestamp: tx.burn_block_time_iso ?? tx.block_time_iso ?? "",
    }));
}

// Total transactions touching a contract address, used as its call count. The
// Hiro `total` counts every transaction including the single deploy, so we
// subtract it. Returns 0 on any failure rather than throwing.
export async function fetchContractCallCount(contractName: string): Promise<number> {
  const contractId = `${EXPLORER_CONTRACT_ADDRESS}.${contractName}`;
  const url = `${HIRO_BASE}/extended/v1/address/${contractId}/transactions?limit=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return 0;
    const data = (await res.json()) as { total?: number };
    const total = Number(data.total ?? 0);
    return total > 0 ? total - 1 : 0;
  } catch {
    return 0;
  }
}

export type ReadOnlyResult = {
  // Raw serialized Clarity value returned by the node.
  raw: string;
  // cvToJSON form: { type, value } with full Clarity type annotations.
  json: unknown;
  // cvToValue form: the decoded JavaScript value, easiest to read.
  value: unknown;
};

// Call a read-only function through the Hiro API. Raw argument values are
// serialized according to the function's declared types from the registry, so
// callers pass plain values (a hex string, a principal, a number). Throws on an
// unknown function, a serialization error, or a node-reported failure.
export async function callReadOnly(
  contractName: string,
  functionName: string,
  args: unknown[],
): Promise<ReadOnlyResult> {
  const contract = getContract(contractName);
  if (!contract) throw new Error(`Unknown contract: ${contractName}`);
  const fn = contract.functions.find((f) => f.name === functionName);
  if (!fn) throw new Error(`Unknown function: ${functionName}`);
  if (fn.access !== "read-only") {
    throw new Error(`${functionName} is not read-only`);
  }
  if (args.length !== fn.args.length) {
    throw new Error(`Expected ${fn.args.length} argument(s), received ${args.length}`);
  }

  const serialized = fn.args.map((argDef, i) =>
    withHexPrefix(serializeCV(argToClarityValue(argDef.type, args[i]))),
  );

  const url = `${HIRO_BASE}/v2/contracts/call-read/${EXPLORER_CONTRACT_ADDRESS}/${contractName}/${functionName}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: EXPLORER_CONTRACT_ADDRESS,
        arguments: serialized,
      }),
    });
  } catch (e) {
    // A rejected fetch (timeout, connection reset) is an upstream failure, not
    // a bad request.
    throw new ExplorerUpstreamError(
      e instanceof Error ? `Hiro API request failed: ${e.message}` : "Hiro API request failed",
    );
  }
  if (!res.ok) {
    throw new ExplorerUpstreamError(`Hiro API returned ${res.status}`);
  }
  const data = (await res.json()) as {
    okay?: boolean;
    result?: string;
    cause?: string;
  };
  if (!data.okay || !data.result) {
    throw new Error(data.cause ?? "Read-only call failed");
  }
  const cv = deserializeCV(data.result);
  return {
    raw: data.result,
    json: cvToJSON(cv),
    value: cvToValue(cv, true),
  };
}
