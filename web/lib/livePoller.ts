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

// The configured single-anchor contract name. Its events are the primary
// "anchor" kind; a custom deployment may point this at a non-default name.
const SINGLE_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

const MAX_BACKOFF_MS = 60_000;
// How many events to request on the first page of each poll. New activity is
// usually sparse relative to the interval, so a small window is normally enough.
const EVENTS_PER_POLL = 5;
// When a burst (e.g. a ten-file batch registers ten events at once) pushes the
// previous cursor off the first page, keep paging with a larger window until we
// find it again. Hiro caps `limit` at 50.
const PAGE_CHASE_SIZE = 50;
// Stop chasing after this many events so a long gap can never loop unbounded.
const BURST_SAFETY_CAP = 200;
// Stored as a contract's "last seen" id when its baseline poll found no events,
// so a later first event is delivered instead of rebaselining on it. Real event
// ids are never empty, so "" is a safe sentinel.
const EMPTY_BASELINE = "";

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
  // Group anchor location { group-id, index } for group events, null otherwise.
  // Lets the ticker link to the exact group row instead of an owner-keyed guess.
  groupId: number | null;
  groupIndex: number | null;
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
  if (
    contractName === SINGLE_CONTRACT_NAME ||
    contractName.endsWith(`.${SINGLE_CONTRACT_NAME}`)
  ) {
    return "anchor";
  }
  return "other";
}

// cvToValue may return a plain tuple ({ hash: "0x.." }) or the verbose Clarity
// form ({ value: { hash: { value: "0x.." } } }), and field values can arrive
// wrapped as { type, value } even when the top level is plain, depending on the
// @stacks/transactions version. These helpers read either shape (mirroring the
// ones in lib/hiroAnchor.ts).
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

function decodePrintTuple(hex: string): Record<string, unknown> | null {
  if (!hex) return null;
  try {
    const cv = deserializeCV(stripHex(hex));
    const value = cvToValue(cv, true);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return tupleFields(value);
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

  const hashRaw = asString(fieldValue(tuple?.["hash"])) ?? null;
  const hash = hashRaw ? stripHex(hashRaw).toLowerCase() || null : null;
  const owner =
    asString(fieldValue(tuple?.["anchored-by"])) ??
    asString(fieldValue(tuple?.["owner"])) ??
    asString(fieldValue(tuple?.["admin"])) ??
    null;
  const stacksBlock =
    asNumber(fieldValue(tuple?.["stacks-block"])) ??
    asNumber(fieldValue(tuple?.["anchored-at"]));
  const kind = kindForContract(contractName);
  // Group events carry their { group-id, index } location in the print tuple,
  // so the ticker can link to the exact group row instead of an owner guess.
  const groupId =
    kind === "group" ? asNumber(fieldValue(tuple?.["group-id"])) : null;
  const groupIndex =
    kind === "group" ? asNumber(fieldValue(tuple?.["index"])) : null;

  return {
    id: `${contractId}:${txId}:${eventIndex}`,
    contractId,
    contractName,
    txId,
    kind,
    eventName: asString(fieldValue(tuple?.["event"])) ?? "",
    hash,
    label: asString(fieldValue(tuple?.["label"])),
    owner,
    stacksBlock,
    groupId,
    groupIndex,
    receivedAt,
  };
}

export class LivePoller {
  private readonly contractAddresses: string[];
  private readonly baseInterval: number;
  private readonly onNewEvents: (events: LiveEvent[]) => void;
  private readonly onStatusChange?: (status: LiveStatus) => void;

  // Newest event id seen per contract. A contract absent from this map has not
  // been baselined yet; EMPTY_BASELINE marks one baselined with no events.
  private lastSeen = new Map<string, string>();
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

  private async fetchEventsPage(
    contractId: string,
    limit: number,
    offset: number,
  ): Promise<{ events: LiveEvent[]; rawCount: number }> {
    const url = `${HIRO_BASE}/extended/v1/contract/${contractId}/events?limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`events ${contractId}: ${res.status}`);
    }
    const data = (await res.json()) as { results?: RawEvent[] };
    const results = Array.isArray(data.results) ? data.results : [];
    const contractName = contractNameOf(contractId);
    const now = Date.now();

    const events: LiveEvent[] = [];
    for (const raw of results) {
      const ev = parseEvent(raw, contractId, contractName, now);
      if (ev) events.push(ev);
    }
    return { events, rawCount: results.length };
  }

  private async pollContract(contractId: string): Promise<LiveEvent[]> {
    // First poll: baseline only. Record the newest event id, or an empty-baseline
    // sentinel when the contract has no activity yet, and emit nothing so opening
    // the app does not replay history. Keying off has() rather than an undefined
    // value means a contract that baselines empty is not rebaselined on its first
    // real event (which would otherwise be swallowed).
    if (!this.lastSeen.has(contractId)) {
      const { events } = await this.fetchEventsPage(
        contractId,
        EVENTS_PER_POLL,
        0,
      );
      this.lastSeen.set(
        contractId,
        events.length > 0 ? events[0].id : EMPTY_BASELINE,
      );
      return [];
    }

    const previous = this.lastSeen.get(contractId);

    // Results are newest-first. Page through until we find the previous cursor,
    // exhaust the source, or hit the safety cap, so a burst larger than one page
    // does not strand the older new events.
    const fresh: LiveEvent[] = [];
    let newest: string | undefined;
    let offset = 0;
    let limit = EVENTS_PER_POLL;
    while (offset < BURST_SAFETY_CAP) {
      const { events, rawCount } = await this.fetchEventsPage(
        contractId,
        limit,
        offset,
      );
      if (events.length === 0) break;
      if (newest === undefined) newest = events[0].id;

      let found = false;
      for (const ev of events) {
        if (ev.id === previous) {
          found = true;
          break;
        }
        fresh.push(ev);
      }
      if (found) break;
      // A short page means the source is exhausted.
      if (rawCount < limit) break;
      offset += rawCount;
      // Escalate the window while chasing so we close the gap quickly.
      limit = PAGE_CHASE_SIZE;
    }

    if (newest !== undefined) this.lastSeen.set(contractId, newest);
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
