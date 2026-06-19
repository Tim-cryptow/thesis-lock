"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { validateStacksAddress } from "@stacks/transactions";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { HEX_64 } from "@/lib/verify";
import {
  type WatchItem,
  type WatchType,
  WATCHLIST_CHANGED_EVENT,
  addWatch,
  loadWatchlist,
  removeWatch,
} from "@/lib/watchlist";

const TYPE_LABELS: Record<WatchType, string> = {
  hash: "Hash",
  wallet: "Wallet",
  group: "Group",
};

const TYPE_PLACEHOLDERS: Record<WatchType, string> = {
  hash: "64-character document hash",
  wallet: "SP... wallet address",
  group: "Group id, e.g. 3",
};

const SECTION_TITLES: Record<WatchType, string> = {
  hash: "Watched Hashes",
  wallet: "Watched Wallets",
  group: "Watched Groups",
};

function truncateMiddle(value: string, lead = 8, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function viewHref(item: WatchItem): string {
  if (item.type === "hash") return `/v/${item.value}`;
  if (item.type === "wallet") return `/u/${item.value}`;
  return `/groups/${item.value}`;
}

function validate(type: WatchType, value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter a value to watch.";
  if (type === "hash") {
    const h = v.toLowerCase().replace(/^0x/, "");
    if (!HEX_64.test(h)) return "A hash must be 64 hexadecimal characters.";
  }
  if (type === "wallet" && !validateStacksAddress(v.toUpperCase())) {
    return "Enter a valid Stacks wallet address.";
  }
  if (type === "group") {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) return "A group id is a positive number.";
  }
  return null;
}

function StatusIndicator({ item }: { item: WatchItem }) {
  const status = item.lastStatus;
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
        <span className="h-2 w-2 rounded-full bg-foreground/30" />
        Not checked yet
      </span>
    );
  }
  if (item.type === "hash") {
    return status.verified ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Verified
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Not found
      </span>
    );
  }
  const count = status.anchorCount ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-blue-500">
      <span className="h-2 w-2 rounded-full bg-blue-500" />
      {count.toLocaleString("en-US")} {count === 1 ? "anchor" : "anchors"}
      {(status.newAnchors ?? 0) > 0 && (
        <span className="ml-1 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-500">
          +{status.newAnchors} new
        </span>
      )}
    </span>
  );
}

function ItemCard({
  item,
  onRemove,
}: {
  item: WatchItem;
  onRemove: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [item.value]);

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{item.label}</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="font-mono text-xs text-foreground/65 break-all">
              {truncateMiddle(item.value)}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 rounded border border-foreground/15 px-1.5 py-0.5 text-[10px] text-foreground/60 hover:text-foreground"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <StatusIndicator item={item} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="text-foreground/45">
          Checked {relativeTime(item.lastChecked)}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Link
            href={viewHref(item)}
            className="text-foreground/70 underline hover:text-foreground"
          >
            View
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-foreground/55 hover:text-red-500"
          >
            Remove
          </button>
        </span>
      </div>
    </div>
  );
}

export default function WatchlistClient() {
  const { t } = useI18n();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [type, setType] = useState<WatchType>("hash");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load once on mount and stay in sync with changes from elsewhere (watch
  // buttons on other pages, another tab).
  useEffect(() => {
    setItems(loadWatchlist());
    const sync = () => setItems(loadWatchlist());
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validate(type, value);
      if (validationError) {
        setError(validationError);
        return;
      }
      addWatch(type, value, label);
      setItems(loadWatchlist());
      setValue("");
      setLabel("");
      setError(null);
    },
    [type, value, label],
  );

  const remove = useCallback((id: string) => {
    removeWatch(id);
    setItems(loadWatchlist());
  }, []);

  const sections = useMemo(
    () =>
      (["hash", "wallet", "group"] as WatchType[]).map((sectionType) => ({
        type: sectionType,
        items: items.filter((i) => i.type === sectionType),
      })),
    [items],
  );

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
          href="/search"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.search")}
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.feed")}
        </Link>
        <Link
          href="/stats"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.stats")}
        </Link>
        <span className="text-foreground font-medium">
          {t("common.nav.watchlist")}
        </span>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.docs")}
        </Link>
      </div>

      <h1 className="text-3xl mb-2">Watchlist</h1>
      <p className="text-foreground/70 mb-8 max-w-2xl">
        Save document hashes, wallets, and groups you want to monitor. Check back
        any time to see whether a hash has been anchored or whether a wallet or
        group has new anchors. Your watchlist is stored only in this browser.
      </p>

      <form
        onSubmit={submit}
        className="rounded-lg border border-foreground/10 bg-card p-5 mb-10"
      >
        <div className="flex gap-1 mb-4">
          {(["hash", "wallet", "group"] as WatchType[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setType(opt);
                setError(null);
              }}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                type === opt
                  ? "bg-heading text-background"
                  : "border border-foreground/15 text-foreground/70 hover:border-foreground/40"
              }`}
            >
              {TYPE_LABELS[opt]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={TYPE_PLACEHOLDERS[type]}
            className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:border-foreground/50"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional friendly name)"
            maxLength={64}
            className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <button
              type="submit"
              className="rounded-md bg-heading px-4 py-2 text-sm text-background hover:opacity-90"
            >
              Add to Watchlist
            </button>
          </div>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-foreground/55">
          Your watchlist is empty. Add a hash, wallet, or group above, or use the
          watch buttons on verify, profile, group, search, and feed pages.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <section key={section.type}>
                  <h2 className="text-sm font-medium text-foreground/70 mb-3">
                    {SECTION_TITLES[section.type]}{" "}
                    <span className="text-foreground/40">
                      ({section.items.length})
                    </span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {section.items.map((item) => (
                      <ItemCard key={item.id} item={item} onRemove={remove} />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      )}
    </div>
  );
}
