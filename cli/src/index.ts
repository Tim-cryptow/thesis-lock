import { createClient, ThesisLockClient } from "thesislock-sdk";

export const CONTRACT_ADDRESS = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
export const SITE_URL = "https://thesis-lock.vercel.app";

export const CONTRACT_NAMES = [
  "thesislock",
  "thesislock-batch",
  "thesislock-registry",
  "thesislock-proof",
  "thesislock-groups",
] as const;

export const DEFAULT_API_URL = "https://api.mainnet.hiro.so";

export function apiUrl(): string {
  return (process.env.THESISLOCK_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

export function getClient(): ThesisLockClient {
  return createClient({ apiUrl: apiUrl(), contractAddress: CONTRACT_ADDRESS });
}

export function truncateMiddle(value: string, chars = 8): string {
  if (value.length <= chars * 2 + 3) return value;
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}

type BlockResponse = {
  block_time_iso?: string;
};

/** ISO timestamp of a Stacks block, or null when the lookup fails. */
export async function getBlockTime(height: number): Promise<string | null> {
  if (!Number.isInteger(height) || height <= 0) return null;
  try {
    const res = await fetch(`${apiUrl()}/extended/v2/blocks/${height}`);
    if (!res.ok) return null;
    const data = (await res.json()) as BlockResponse;
    return data.block_time_iso ?? null;
  } catch {
    return null;
  }
}
