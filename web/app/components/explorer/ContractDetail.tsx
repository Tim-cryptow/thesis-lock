"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReadOnlyTester from "@/app/components/explorer/ReadOnlyTester";
import { useLive } from "@/app/components/LiveProvider";
import type { LiveEvent } from "@/lib/livePoller";
import {
  type ContractCall,
  type ContractInfo,
  type FunctionInfo,
  fetchContractCalls,
  functionSignature,
  getPublicFunctions,
  getReadOnlyFunctions,
} from "@/lib/contractExplorer";

type Tab = "functions" | "calls" | "tryit";

// A live print event for this contract, rendered as a provisional call row
// until the next full fetch reconciles it.
function liveEventToCall(ev: LiveEvent): ContractCall {
  return {
    txId: ev.txId,
    function: ev.eventName || "call",
    sender: ev.owner ?? "",
    block: ev.stacksBlock ?? 0,
    status: "success",
    timestamp: new Date(ev.receivedAt).toISOString(),
  };
}

function txUrl(txId: string): string {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  return `https://explorer.hiro.so/txid/${id}?chain=mainnet`;
}

function truncateMiddle(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

function relativeTime(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ContractDetail({
  contract,
  callCount,
}: {
  contract: ContractInfo;
  callCount?: number;
}) {
  const [tab, setTab] = useState<Tab>("functions");
  // New live calls for this contract seen while the Recent Calls tab is not open.
  const [newCallCount, setNewCallCount] = useState(0);
  const { events: liveEvents } = useLive();
  const processedRef = useRef<Set<string>>(new Set());

  // Reset to the first tab and clear live tracking whenever a different
  // contract is selected.
  useEffect(() => {
    setTab("functions");
    setNewCallCount(0);
    processedRef.current = new Set();
  }, [contract.name]);

  // Count new live events for this contract; opening the tab clears the badge.
  useEffect(() => {
    if (tab === "calls") {
      setNewCallCount(0);
      return;
    }
    let added = 0;
    for (const ev of liveEvents) {
      if (ev.contractName !== contract.name) continue;
      if (processedRef.current.has(ev.id)) continue;
      processedRef.current.add(ev.id);
      added += 1;
    }
    if (added > 0) setNewCallCount((n) => n + added);
  }, [liveEvents, tab, contract.name]);

  return (
    <div>
      <ContractHeader contract={contract} callCount={callCount} />

      <div
        role="tablist"
        aria-label="Contract sections"
        className="flex gap-1 border-b border-foreground/10 mt-6 mb-6"
      >
        <TabButton active={tab === "functions"} onClick={() => setTab("functions")}>
          Functions
        </TabButton>
        <TabButton active={tab === "calls"} onClick={() => setTab("calls")}>
          Recent Calls
          {newCallCount > 0 && (
            <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              {newCallCount} new
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "tryit"} onClick={() => setTab("tryit")}>
          Try It
        </TabButton>
      </div>

      {tab === "functions" && <FunctionsTab contract={contract} />}
      {tab === "calls" && <RecentCallsTab contract={contract} />}
      {tab === "tryit" && <ReadOnlyTester contract={contract} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-foreground/55 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ContractHeader({ contract, callCount }: { contract: ContractInfo; callCount?: number }) {
  const [copied, setCopied] = useState(false);
  const identifier = `${contract.address}.${contract.name}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(identifier);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [identifier]);

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-5">
      <h2 className="text-xl font-mono">{contract.name}</h2>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="font-mono text-foreground/70 break-all">{identifier}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded border border-foreground/15 px-2 py-0.5 text-foreground/60 hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-xs text-foreground/45">Deploy tx</dt>
          <dd>
            <a
              href={txUrl(contract.deployTx)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-foreground/85 underline hover:text-foreground"
            >
              {truncateMiddle(contract.deployTx, 8, 6)}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-foreground/45">Deploy block</dt>
          <dd className="font-mono text-foreground/85">
            {contract.deployBlock.toLocaleString("en-US")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-foreground/45">Total calls</dt>
          <dd className="font-mono text-foreground/85">
            {callCount === undefined ? "..." : callCount.toLocaleString("en-US")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-foreground/45">Functions</dt>
          <dd className="font-mono text-foreground/85">{contract.functions.length}</dd>
        </div>
      </dl>

      {(contract.maps.length > 0 || contract.variables.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {contract.maps.map((m) => (
            <span
              key={`map-${m}`}
              className="rounded border border-foreground/15 px-2 py-0.5 font-mono text-foreground/70"
              title="Data map"
            >
              map {m}
            </span>
          ))}
          {contract.variables.map((v) => (
            <span
              key={`var-${v}`}
              className="rounded border border-foreground/15 px-2 py-0.5 font-mono text-foreground/70"
              title="Data variable"
            >
              var {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FunctionsTab({ contract }: { contract: ContractInfo }) {
  const publicFns = getPublicFunctions(contract);
  const readFns = getReadOnlyFunctions(contract);

  return (
    <div className="flex flex-col gap-8">
      {publicFns.length > 0 && (
        <FunctionGroup
          title="Public Functions"
          subtitle="Write state, must be signed by a wallet."
          functions={publicFns}
          accent="public"
        />
      )}
      {readFns.length > 0 && (
        <FunctionGroup
          title="Read-Only Functions"
          subtitle="Free reads, callable without a wallet."
          functions={readFns}
          accent="read-only"
        />
      )}
    </div>
  );
}

function FunctionGroup({
  title,
  subtitle,
  functions,
  accent,
}: {
  title: string;
  subtitle: string;
  functions: FunctionInfo[];
  accent: "public" | "read-only";
}) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-foreground/50 mb-3">{subtitle}</p>
      <div className="flex flex-col gap-3">
        {functions.map((fn) => (
          <FunctionCard key={fn.name} fn={fn} accent={accent} />
        ))}
      </div>
    </section>
  );
}

function FunctionCard({ fn, accent }: { fn: FunctionInfo; accent: "public" | "read-only" }) {
  const [open, setOpen] = useState(false);
  const accentClass = accent === "public" ? "border-l-blue-500" : "border-l-green-500";
  const badgeClass =
    accent === "public" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500";

  return (
    <div className={`rounded-lg border border-foreground/10 border-l-2 ${accentClass} bg-card p-4`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-sm">{fn.name}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${badgeClass}`}>
          {fn.access}
        </span>
        <span className="ml-auto text-xs text-foreground/40">{open ? "Hide" : "Signature"}</span>
      </button>

      <p className="mt-2 text-sm text-foreground/70">{fn.description}</p>

      <div className="mt-3 grid gap-2 text-xs">
        <div>
          <span className="text-foreground/45">Arguments: </span>
          {fn.args.length === 0 ? (
            <span className="text-foreground/60">none</span>
          ) : (
            <span className="font-mono text-foreground/80">
              {fn.args.map((a) => `${a.name}: ${a.type}`).join(", ")}
            </span>
          )}
        </div>
        <div>
          <span className="text-foreground/45">Returns: </span>
          <span className="font-mono text-foreground/80">{fn.returnType}</span>
        </div>
      </div>

      {open && (
        <pre className="mt-3 overflow-x-auto rounded bg-background/60 border border-foreground/10 p-3 text-xs font-mono text-foreground/80">
          {functionSignature(fn)}
        </pre>
      )}
    </div>
  );
}

function statusClass(status: string): string {
  if (status === "success") return "bg-green-500/10 text-green-500";
  if (status === "pending") return "bg-amber-500/10 text-amber-500";
  return "bg-red-500/10 text-red-500";
}

function RecentCallsTab({ contract }: { contract: ContractInfo }) {
  const [calls, setCalls] = useState<ContractCall[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("");
  // Tx ids of rows that arrived live and should briefly glow.
  const [glow, setGlow] = useState<Set<string>>(new Set());
  const { events: liveEvents } = useLive();
  const processedRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await fetchContractCalls(contract.name, 20);
      setCalls(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [contract.name]);

  // Initial load plus a 30s auto-refresh so the table tracks new calls.
  useEffect(() => {
    setCalls(null);
    processedRef.current = new Set();
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Prepend new live events for this contract at the top of the table with a
  // brief highlight, until the next fetch reconciles them.
  useEffect(() => {
    if (calls === null) return;
    const fresh: ContractCall[] = [];
    for (const ev of liveEvents) {
      if (ev.contractName !== contract.name) continue;
      if (processedRef.current.has(ev.id)) continue;
      processedRef.current.add(ev.id);
      fresh.push(liveEventToCall(ev));
    }
    if (fresh.length === 0) return;
    setCalls((prev) => {
      const base = prev ?? [];
      const have = new Set(base.map((c) => c.txId));
      const toAdd = fresh.filter((c) => !have.has(c.txId));
      return toAdd.length === 0 ? prev : [...toAdd, ...base];
    });
    const ids = fresh.map((c) => c.txId);
    setGlow((g) => {
      const next = new Set(g);
      ids.forEach((i) => next.add(i));
      return next;
    });
    ids.forEach((i) =>
      setTimeout(() => {
        setGlow((g) => {
          const next = new Set(g);
          next.delete(i);
          return next;
        });
      }, 2500),
    );
  }, [liveEvents, contract.name, calls]);

  const functionNames = useMemo(() => contract.functions.map((f) => f.name), [contract.functions]);

  const visible = useMemo(
    () => (calls ?? []).filter((c) => !filter || c.function === filter),
    [calls, filter],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <label className="text-xs text-foreground/55">
          Filter by function{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-1 rounded border border-foreground/15 bg-background px-2 py-1 text-foreground/80"
          >
            <option value="">All functions</option>
            {functionNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-foreground/40">Refreshes every 30s</span>
      </div>

      {error ? (
        <p className="text-sm text-foreground/60">
          Could not load recent calls. They will retry shortly.
        </p>
      ) : calls === null ? (
        <p className="text-sm text-foreground/50" aria-busy="true">
          Loading recent calls...
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-foreground/60">
          No recent contract calls{filter ? ` to ${filter}` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-xs text-foreground/45">
                <th className="px-3 py-2 font-medium">Function</th>
                <th className="px-3 py-2 font-medium">Sender</th>
                <th className="px-3 py-2 font-medium">Block</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.txId}
                  className={`border-b border-foreground/5 last:border-0 ${
                    glow.has(c.txId) ? "live-glow" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{c.function}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/u/${c.sender}`}
                      className="font-mono text-xs text-foreground/70 underline hover:text-foreground"
                    >
                      {truncateMiddle(c.sender)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground/70">
                    {c.block.toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${statusClass(
                        c.status,
                      )}`}
                    >
                      {c.status === "success"
                        ? "success"
                        : c.status === "pending"
                          ? "pending"
                          : "failed"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/55">
                    {relativeTime(c.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={txUrl(c.txId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-foreground/70 underline hover:text-foreground"
                    >
                      view
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
