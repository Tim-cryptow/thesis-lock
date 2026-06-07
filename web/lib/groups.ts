import { cvToValue, deserializeCV } from "@stacks/transactions";
import { getGroup, getGroupAnchorCount, type Group } from "./stacks";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const GROUPS_CONTRACT = "thesislock-groups";

export type GroupSummary = Group & {
  id: number;
  anchorCount: number;
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
const PAGINATE_SAFETY_CAP = 500;

async function fetchEvents(limit: number, offset: number): Promise<RawEvent[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${GROUPS_CONTRACT}/events?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
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
async function fetchAllEvents(): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  let offset = 0;
  for (;;) {
    const fetched = await fetchEvents(HIRO_PAGE, offset);
    events.push(...fetched);
    if (fetched.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
    if (offset >= PAGINATE_SAFETY_CAP) break;
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
      const [group, anchorCount] = await Promise.all([
        getGroup(id),
        getGroupAnchorCount(id),
      ]);
      if (!group) return null;
      return { id, anchorCount, ...group };
    }),
  );

  return summaries
    .filter((s): s is GroupSummary => s !== null)
    .sort((a, b) => b.id - a.id);
}
