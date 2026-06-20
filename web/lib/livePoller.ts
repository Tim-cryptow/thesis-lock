// Polls the Hiro contract-events API for new on-chain activity and reports it
// through a callback. Deliberately framework-agnostic: it holds no React state
// and can be driven by any consumer. LiveProvider wraps a single instance and
// fans the events out to the UI.
//
// Design notes:
//  - The first poll for each contract is a baseline: it records the newest
//    event without emitting, so opening the app does not flood the ticker with
//    history. Only events that land after that baseline are reported as new.
//  - Polling pauses while the tab is hidden (Page Visibility API) and resumes
//    with an immediate poll when it becomes visible again, so a backgrounded
//    tab does not keep hitting the API.
//  - A failed poll cycle backs off exponentially (interval -> 2x -> 4x, capped
//    at 60s) and resets to the base interval on the next success.

import { cvToValue, deserializeCV } from "@stacks/transactions";

const HIRO_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

const MAX_BACKOFF_MS = 60_000;
// How many events to request per contract per poll. New activity is rare
// relative to the poll interval, so a small window is enough to catch every
// new event between two polls.
const EVENTS_PER_POLL = 5;

export type LiveEventKind =
  | "anchor"
  | "batch"
  | "registry"
  | "proof"
  | "group"
  | "other";

export type LiveEvent = {
  // Stable identity across polls: contract + tx + event index.
  id: string;
  contractId: string;
  contractName: string;
  txId: string;
  kind: LiveEventKind;
  // The raw `event` field from the print tuple (e.g. "anchor-created"), or "".
  eventName: string;
  hash: string | null;
  label: string | null;
  owner: string | null;
  stacksBlock: number | null;
  // Client clock time (ms) when this event was first observed. The events
  // endpoint carries no timestamp, so relative "Ns ago" labels use this.
  receivedAt: number;
};

export type LiveStatus = "ok" | "error";

export type LivePollerOptions = {
  // Full contract identifiers, e.g. "SP3Q....thesislock".
  contractAddresses: string[];
  interval?: number;
  onNewEvents: (events: LiveEvent[]) => void;
  // Optional: notified when a poll cycle succeeds ("ok") or fails ("error").
  onStatusChange?: (status: LiveStatus) => void;
};

type RawEvent = {
  event_index?: number;
  event_type?: string;
  tx_id?: string;
  contract_log?: {
    contract_id?: string;
    topic?: string;
    value?: { hex?: string; repr?: string };
  };
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  return null;
}

// The trailing path segment after the last dot is the contract name.
function contractNameOf(contractId: string): string {
  const dot = contractId.lastIndexOf(".");
  return dot === -1 ? contractId : contractId.slice(dot + 1);
}

function kindForContract(contractName: string): LiveEventKind {
  if (contractName.endsWith("-batch")) return "batch";
  if (contractName.endsWith("-registry")) return "registry";
  if (contractName.endsWith("-proof")) return "proof";
  if (contractName.endsWith("-groups")) return "group";
  if (contractName === "thesislock" || contractName.endsWith(".thesislock")) {
    return "anchor";
  }
  return "other";
}

function decodePrintTuple(hex: string): Record<string, unknown> | null {
  if (!hex) return null;
  try {
    const cv = deserializeCV(stripHex(hex));
    const value = cvToValue(cv, true);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// Build a LiveEvent from a raw Hiro event, reading whatever recognizable
// anchor fields are present. Returns null only when the event has no usable
// print payload at all.
function parseEvent(
  raw: RawEvent,
  contractId: string,
  contractName: string,
  receivedAt: number,
): LiveEvent | null {
  const txId = raw.tx_id ?? "";
  if (!txId) return null;
  const eventIndex = asNumber(raw.event_index) ?? 0;
  const tuple = decodePrintTuple(raw.contract_log?.value?.hex ?? "");

  const hashRaw =
    asString(tuple?.["hash"]) ?? null;
  const hash = hashRaw ? stripHex(hashRaw).toLowerCase() || null : null;
  const owner =
    asString(tuple?.["anchored-by"]) ??
    asString(tuple?.["owner"]) ??
    asString(tuple?.["admin"]) ??
    null;
  const stacksBlock =
    asNumber(tuple?.["stacks-block"]) ?? asNumber(tuple?.["anchored-at"]);

  return {
    id: `${contractId}:${txId}:${eventIndex}`,
    contractId,
    contractName,
    txId,
    kind: kindForContract(contractName),
    eventName: asString(tuple?.["event"]) ?? "",
    hash,
    label: asString(tuple?.["label"]),
    owner,
    stacksBlock,
    receivedAt,
  };
}

export class LivePoller {
  private readonly contractAddresses: string[];
  private readonly baseInterval: number;
  private readonly onNewEvents: (events: LiveEvent[]) => void;
  private readonly onStatusChange?: (status: LiveStatus) => void;

  // Newest event id seen per contract. undefined means "not yet baselined".
  private lastSeen = new Map<string, string | undefined>();
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private lastPollTime: number | null = null;
  private visibilityBound: (() => void) | null = null;

  constructor(options: LivePollerOptions) {
    this.contractAddresses = options.contractAddresses;
    this.baseInterval = options.interval ?? 15_000;
    this.onNewEvents = options.onNewEvents;
    this.onStatusChange = options.onStatusChange;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (typeof document !== "undefined") {
      this.visibilityBound = () => this.handleVisibilityChange();
      document.addEventListener("visibilitychange", this.visibilityBound);
    }
    // Kick off immediately unless the tab is already hidden.
    if (!this.isHidden()) {
      void this.tick();
    }
  }

  stop(): void {
    this.running = false;
    this.clearTimer();
    if (this.visibilityBound && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityBound);
      this.visibilityBound = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getLastPollTime(): number | null {
    return this.lastPollTime;
  }

  private isHidden(): boolean {
    return typeof document !== "undefined" && document.hidden;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private handleVisibilityChange(): void {
    if (!this.running) return;
    if (this.isHidden()) {
      // Pause: stop scheduling further polls while hidden.
      this.clearTimer();
    } else {
      // Resume with an immediate poll.
      this.clearTimer();
      void this.tick();
    }
  }

  private currentDelay(): number {
    if (this.consecutiveErrors === 0) return this.baseInterval;
    const scaled = this.baseInterval * 2 ** this.consecutiveErrors;
    return Math.min(scaled, MAX_BACKOFF_MS);
  }

  private scheduleNext(): void {
    if (!this.running || this.isHidden()) return;
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.tick();
    }, this.currentDelay());
  }

  private async pollContract(contractId: string): Promise<LiveEvent[]> {
    const url = `${HIRO_BASE}/extended/v1/contract/${contractId}/events?limit=${EVENTS_PER_POLL}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`events ${contractId}: ${res.status}`);
    }
    const data = (await res.json()) as { results?: RawEvent[] };
    const results = Array.isArray(data.results) ? data.results : [];
    const contractName = contractNameOf(contractId);
    const now = Date.now();

    const parsed: LiveEvent[] = [];
    for (const raw of results) {
      const ev = parseEvent(raw, contractId, contractName, now);
      if (ev) parsed.push(ev);
    }
    if (parsed.length === 0) return [];

    const previous = this.lastSeen.get(contractId);
    // Record the newest event id for next time regardless of outcome.
    const newest = parsed[0].id;

    if (previous === undefined) {
      // First poll: baseline only, emit nothing.
      this.lastSeen.set(contractId, newest);
      return [];
    }

    // Results are newest-first; collect everything ahead of the last seen id.
    const fresh: LiveEvent[] = [];
    for (const ev of parsed) {
      if (ev.id === previous) break;
      fresh.push(ev);
    }
    this.lastSeen.set(contractId, newest);
    // Oldest-first so callers can prepend in chronological order.
    return fresh.reverse();
  }

  private async tick(): Promise<void> {
    if (!this.running || this.isHidden()) return;

    const settled = await Promise.allSettled(
      this.contractAddresses.map((id) => this.pollContract(id)),
    );

    const failed = settled.some((r) => r.status === "rejected");
    const fresh: LiveEvent[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") fresh.push(...r.value);
    }

    if (failed) {
      this.consecutiveErrors += 1;
      this.onStatusChange?.("error");
    } else {
      this.consecutiveErrors = 0;
      this.lastPollTime = Date.now();
      this.onStatusChange?.("ok");
    }

    if (fresh.length > 0) {
      // Sort the combined cross-contract batch by block, oldest first, so the
      // most recent on-chain event ends up at the front when prepended.
      fresh.sort((a, b) => {
        const ab = a.stacksBlock ?? 0;
        const bb = b.stacksBlock ?? 0;
        if (ab !== bb) return ab - bb;
        return a.receivedAt - b.receivedAt;
      });
      this.onNewEvents(fresh);
    }

    this.scheduleNext();
  }
}
