import { cvToValue, deserializeCV } from "@stacks/transactions";
import { getGroup, getGroupAnchorAt, getGroupAnchorCount, type Group } from "./stacks";
import { fetchWithRetry } from "./fetchWithRetry";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const GROUPS_CONTRACT = "thesislock-groups";

export type GroupSummary = Group & {
  id: number;
  anchorCount: number;
};

export type GroupAnchorMatch = {
  groupId: number;
  index: number;
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  groupName?: string;
};

type RawEvent = {
  tx_id: string;
  event_type: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: { hex: string; repr: string };
  };
};

type EventsResponse = { results: RawEvent[] };

type GroupAction =
  | { kind: "created"; groupId: number; member: string }
  | { kind: "added"; groupId: number; member: string }
  | { kind: "removed"; groupId: number; member: string };

const HIRO_PAGE = 50;

async function fetchEvents(limit: number, offset: number): Promise<RawEvent[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${GROUPS_CONTRACT}/events?limit=${limit}&offset=${offset}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Hiro events fetch failed (${GROUPS_CONTRACT}): ${res.status}`);
  }
  const data = (await res.json()) as EventsResponse;
  return Array.isArray(data.results) ? data.results : [];
}

// Hiro returns a contract's events newest-first across all topics, so a single
// paginated pass over this contract gives a chronologically ordered stream of
// every membership change. The contract has no on-chain member enumeration, so
// reconstructing membership from these print events is the only way to list a
// group's current members or the groups a wallet belongs to.
//
// We must page through every event, not stop at a fixed offset: membership
// events share the stream with every group-anchor-added print, so a fixed cap
// would let anchor volume push still-current group-created / member-added
// records off the end, making members and groups vanish from the UI even
// though the on-chain map is unchanged. The loop terminates naturally when a
// short page signals the source is exhausted.
async function fetchAllEvents(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  let offset = 0;
  for (;;) {
    const fetched = await fetchEvents(HIRO_PAGE, offset);
    events.push(...fetched);
    if (fetched.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
  }
  return events;
}

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}

function parseEvent(ev: RawEvent): GroupAction | null {
  const hex = ev.contract_log?.value?.hex ?? "";
  if (!hex) return null;
  let tuple: Record<string, unknown>;
  try {
    const value = cvToValue(deserializeCV(stripHex(hex)), true);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    tuple = value as Record<string, unknown>;
  } catch {
    return null;
  }
  const event = String(tuple["event"] ?? "");
  const groupId = asNumber(tuple["group-id"]);
  if (event === "group-created") {
    return { kind: "created", groupId, member: String(tuple["admin"] ?? "") };
  }
  if (event === "member-added") {
    return { kind: "added", groupId, member: String(tuple["member"] ?? "") };
  }
  if (event === "member-removed") {
    return { kind: "removed", groupId, member: String(tuple["member"] ?? "") };
  }
  return null;
}

// Walk the newest-first stream and keep only the first (latest) action seen
// per (group, member) pair. "created"/"added" mean the member is current;
// "removed" means they are not.
function reconstructMembership(events: RawEvent[]): Map<string, boolean> {
  const latest = new Map<string, boolean>();
  for (const ev of events) {
    const action = parseEvent(ev);
    if (!action || !action.member) continue;
    const key = `${action.groupId}|${action.member}`;
    if (latest.has(key)) continue;
    latest.set(key, action.kind !== "removed");
  }
  return latest;
}

function parseGroupAnchorEvent(ev: RawEvent): GroupAnchorMatch | null {
  const hex = ev.contract_log?.value?.hex ?? "";
  if (!hex) return null;
  let tuple: Record<string, unknown>;
  try {
    const value = cvToValue(deserializeCV(stripHex(hex)), true);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    tuple = value as Record<string, unknown>;
  } catch {
    return null;
  }
  if (String(tuple["event"] ?? "") !== "group-anchor-added") return null;
  return {
    groupId: asNumber(tuple["group-id"]),
    index: asNumber(tuple["index"]),
    hash: stripHex(String(tuple["hash"] ?? "")).toLowerCase(),
    label: String(tuple["label"] ?? ""),
    anchoredBy: String(tuple["anchored-by"] ?? ""),
    stacksBlock: asNumber(tuple["stacks-block"]),
  };
}

// Look up a hash among group-anchor print events. The verify page uses this as
// a last resort after the single and batch contracts miss, since a hash
// anchored only through a group lives in thesislock-groups, keyed by group and
// index, with no per-hash on-chain lookup. We must page through every event:
// the stream mixes group creations, membership changes, and anchors, so newer
// prints can push an older group-anchor record past any fixed page and make a
// real anchor read as not found. The group name is fetched separately because
// the print event carries only the group id.
export async function findGroupAnchorByHash(hash: string): Promise<GroupAnchorMatch | null> {
  const target = stripHex(hash).toLowerCase();
  const events = await fetchAllEvents();
  for (const ev of events) {
    const anchor = parseGroupAnchorEvent(ev);
    if (anchor && anchor.hash === target) {
      const group = await getGroup(anchor.groupId);
      return { ...anchor, groupName: group?.name };
    }
  }
  return null;
}

// Resolve the exact group anchor at { groupId, index } directly from the
// on-chain map. A hash anchored in several groups (or re-anchored in one) maps
// to multiple { group-id, index } rows, so search results link with both and
// the verify page resolves the precise one here instead of falling back to the
// newest event for the hash. The hash is returned so the caller can confirm it
// matches the URL and ignore tampered or stale group/index params.
export async function getGroupAnchorByLocation(
  groupId: number,
  index: number,
): Promise<GroupAnchorMatch | null> {
  const [anchor, group] = await Promise.all([getGroupAnchorAt(groupId, index), getGroup(groupId)]);
  if (!anchor) return null;
  return {
    groupId,
    index,
    hash: stripHex(anchor.hash).toLowerCase(),
    label: anchor.label,
    anchoredBy: anchor.anchoredBy,
    stacksBlock: anchor.stacksBlock,
    groupName: group?.name,
  };
}

export async function fetchGroupMembers(groupId: number): Promise<string[]> {
  const membership = reconstructMembership(await fetchAllEvents());
  const prefix = `${groupId}|`;
  const members: string[] = [];
  for (const [key, isCurrent] of membership) {
    if (isCurrent && key.startsWith(prefix)) {
      members.push(key.slice(prefix.length));
    }
  }
  return members;
}

export async function fetchMyGroups(address: string): Promise<GroupSummary[]> {
  const membership = reconstructMembership(await fetchAllEvents());
  const myGroupIds: number[] = [];
  for (const [key, isCurrent] of membership) {
    if (!isCurrent) continue;
    const [gid, member] = key.split("|");
    if (member === address) myGroupIds.push(Number(gid));
  }

  const summaries = await Promise.all(
    myGroupIds.map(async (id): Promise<GroupSummary | null> => {
      const [group, anchorCount] = await Promise.all([getGroup(id), getGroupAnchorCount(id)]);
      if (!group) return null;
      return { id, anchorCount, ...group };
    }),
  );

  return summaries.filter((s): s is GroupSummary => s !== null).sort((a, b) => b.id - a.id);
}
