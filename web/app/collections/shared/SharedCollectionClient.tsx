"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { readAnchor, getProofByHash } from "@/lib/stacks";
import { discoverBatchAndGroupAnchors } from "@/lib/search";
import {
  type Collection,
  decodeCollection,
  exportCollection,
  importCollection,
  itemOwner,
  itemVerifyHref,
  resolveColor,
} from "@/lib/collections";
import { stageReportInput } from "@/lib/reportLink";

type VerifyState = "checking" | "verified" | "notfound" | "error";

function truncateMiddle(value: string, lead = 8, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

// Resolves a single bare hash against the hash-keyed contracts. Batch and group
// anchors need extra keys, so unresolved hashes are swept together by the caller.
async function checkSingle(hash: string): Promise<boolean> {
  const [single, proof] = await Promise.all([
    readAnchor(hash).catch(() => null),
    getProofByHash(hash).catch(() => null),
  ]);
  return Boolean(single || proof);
}

function StatusBadge({ state }: { state: VerifyState }) {
  if (state === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
        <span className="h-2 w-2 rounded-full bg-foreground/30" />
        Checking
      </span>
    );
  }
  if (state === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Verified
      </span>
    );
  }
  if (state === "notfound") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Not found
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
      <span className="h-2 w-2 rounded-full bg-foreground/30" />
      Unknown
    </span>
  );
}

export default function SharedCollectionClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [decoded, setDecoded] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, VerifyState>>({});
  const [imported, setImported] = useState(false);

  // Read the encoded payload from the URL on mount. Reading window.location
  // directly (rather than useSearchParams) avoids the Suspense requirement and
  // mirrors how the report page reads its ?hashes= link.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = new URLSearchParams(window.location.search).get("data");
    setCollection(data ? decodeCollection(data) : null);
    setDecoded(true);
  }, []);

  const hashes = useMemo(
    () => (collection ? collection.items.map((i) => i.hash) : []),
    [collection],
  );

  const verifyAll = useCallback(async () => {
    if (hashes.length === 0) return;
    setStatuses(Object.fromEntries(hashes.map((h) => [h, "checking" as const])));
    const singles = await Promise.all(
      hashes.map(async (h) => ({ hash: h, ok: await checkSingle(h) })),
    );
    const next: Record<string, VerifyState> = {};
    const unresolved: string[] = [];
    for (const { hash, ok } of singles) {
      if (ok) next[hash] = "verified";
      else unresolved.push(hash);
    }
    if (unresolved.length > 0) {
      try {
        const found = await discoverBatchAndGroupAnchors(unresolved);
        for (const hash of unresolved) {
          next[hash] = found.get(hash) ? "verified" : "notfound";
        }
      } catch {
        for (const hash of unresolved) next[hash] = "error";
      }
    }
    setStatuses(next);
  }, [hashes]);

  // Verify on load so the read-only view shows each item's status immediately.
  useEffect(() => {
    if (collection && hashes.length > 0) void verifyAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const importToMine = useCallback(() => {
    if (!collection) return;
    importCollection(exportCollection(collection));
    setImported(true);
  }, [collection]);

  if (!decoded) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <p className="text-foreground/55">Loading...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <Link
          href="/collections"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← Collections
        </Link>
        <p className="mt-8 text-foreground/70">
          This share link is missing or could not be read. Ask the sender for a
          fresh link.
        </p>
      </div>
    );
  }

  const color = resolveColor(collection.color);
  const count = collection.items.length;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link
          href="/collections"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.collections")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-foreground/10 bg-card mb-8">
        <div className={`h-1.5 ${color.bar}`} />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-2xl ${color.chip}`}
            >
              {collection.icon}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl truncate">{collection.name}</h1>
              <div className="text-xs text-foreground/50">
                Shared collection · {count} {count === 1 ? "item" : "items"}
              </div>
            </div>
          </div>
          {collection.description && (
            <p className="mt-3 text-sm text-foreground/70">
              {collection.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={importToMine}
              disabled={imported}
              className="rounded-md bg-heading px-3 py-1.5 text-background hover:opacity-90 disabled:opacity-60"
            >
              {imported ? "Imported" : "Import to My Collections"}
            </button>
            <button
              type="button"
              onClick={() => void verifyAll()}
              className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
            >
              Verify All
            </button>
            {count > 0 && (
              <button
                type="button"
                onClick={() => {
                  stageReportInput(
                    collection.items.map((i) => {
                      const owner = itemOwner(i);
                      return {
                        hash: i.hash,
                        ...(i.label ? { filename: i.label } : {}),
                        ...(owner ? { owner } : {}),
                      };
                    }),
                  );
                  router.push("/report");
                }}
                className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
              >
                Generate Report
              </button>
            )}
          </div>
          {imported && (
            <p className="mt-3 text-xs text-foreground/60">
              Saved to this browser.{" "}
              <Link href="/collections" className="underline hover:text-foreground">
                Open your collections
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <h2 className="text-sm font-medium text-foreground/70 mb-3">
        Items <span className="text-foreground/40">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-foreground/55">
          This collection has no items.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {collection.items.map((item) => (
            <div
              key={item.hash}
              className="rounded-lg border border-foreground/10 bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {item.label && (
                    <div className="font-medium truncate">{item.label}</div>
                  )}
                  <code className="mt-1 block font-mono text-xs text-foreground/65 break-all">
                    {truncateMiddle(item.hash)}
                  </code>
                  {item.note && (
                    <p className="mt-2 text-sm text-foreground/70">{item.note}</p>
                  )}
                </div>
                <StatusBadge state={statuses[item.hash] ?? "checking"} />
              </div>
              <div className="mt-3 text-xs">
                <Link
                  href={itemVerifyHref(item)}
                  className="text-foreground/70 underline hover:text-foreground"
                >
                  Verify
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
