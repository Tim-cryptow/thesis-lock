"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useConfirm } from "@/app/components/useConfirm";
import EmptyState from "@/app/components/EmptyState";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import { useNotifications } from "@/app/components/NotificationProvider";
import { NotificationIcon } from "@/app/components/NotificationIcon";
import {
  type Notification,
  type NotificationType,
  browserPermission,
  requestBrowserPermission,
} from "@/lib/notifications";

type Filter = "all" | "transactions" | "watchlist" | "protocol" | "system";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "transactions", label: "Transactions" },
  { id: "watchlist", label: "Watchlist" },
  { id: "protocol", label: "Protocol" },
  { id: "system", label: "System" },
];

const EMPTY_LABEL: Record<Filter, string> = {
  all: "No notifications yet",
  transactions: "No transaction notifications",
  watchlist: "No watchlist notifications",
  protocol: "No protocol notifications",
  system: "No system notifications",
};

const EMPTY_DESCRIPTION: Record<Filter, string> = {
  all: "Notifications appear here as your transactions confirm and the protocol updates.",
  transactions:
    "Confirmations for your anchor and group transactions will appear here.",
  watchlist:
    "Updates for the hashes, wallets, and groups you watch will appear here.",
  protocol: "New anchors and proof mints across the protocol will appear here.",
  system: "App and maintenance messages will appear here.",
};

// Groups the seven notification types into the five user-facing toggles.
const TYPE_TOGGLES: { label: string; types: NotificationType[] }[] = [
  { label: "Transaction confirmations", types: ["tx_confirmed", "tx_failed"] },
  { label: "Watchlist updates", types: ["watchlist_update"] },
  { label: "New protocol anchors", types: ["new_anchor", "proof_minted"] },
  { label: "Group activity", types: ["group_invite"] },
  { label: "System messages", types: ["system"] },
];

function inFilter(type: NotificationType, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "transactions":
      return type === "tx_confirmed" || type === "tx_failed";
    case "watchlist":
      return type === "watchlist_update";
    case "protocol":
      return (
        type === "new_anchor" ||
        type === "proof_minted" ||
        type === "group_invite"
      );
    case "system":
      return type === "system";
    default:
      return true;
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? "bg-heading" : "bg-foreground/20"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {description ? (
          <div className="text-xs text-foreground/55 mt-0.5">{description}</div>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        label={label}
        disabled={disabled}
      />
    </div>
  );
}

function Row({
  notification,
  onOpen,
  onDismiss,
}: {
  notification: Notification;
  onOpen: (n: Notification) => void;
  onDismiss: (id: string) => void;
}) {
  const unread = !notification.read;
  return (
    <li
      className={`relative flex items-stretch rounded-lg border bg-card transition ${
        unread
          ? "border-foreground/15 border-l-2 border-l-sky-500"
          : "border-foreground/10"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex flex-1 gap-3 p-4 text-left min-w-0 hover:bg-foreground/[0.03] rounded-l-lg transition"
      >
        <span
          className={`mt-0.5 shrink-0 ${
            unread ? "text-heading" : "text-foreground/45"
          }`}
        >
          <NotificationIcon name={notification.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {unread ? (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
              />
            ) : null}
            <span
              className={`truncate ${
                unread ? "font-semibold text-foreground" : "text-foreground/90"
              }`}
            >
              {notification.title}
            </span>
          </span>
          <span className="mt-0.5 block text-sm text-foreground/70">
            {notification.message}
          </span>
          <span className="mt-1.5 flex items-center gap-3 text-xs text-foreground/45">
            <span>{relativeTime(notification.timestamp)}</span>
            {notification.actionUrl && notification.actionLabel ? (
              <span className="rounded border border-foreground/15 px-1.5 py-0.5 text-foreground/70">
                {notification.actionLabel}
              </span>
            ) : null}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        className="shrink-0 px-3 text-foreground/35 hover:text-foreground transition"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </li>
  );
}

export default function NotificationsClient() {
  const {
    notifications,
    unreadCount,
    preferences,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
    updatePreferences,
  } = useNotifications();
  const router = useRouter();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<Filter>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    setPermission(browserPermission());
  }, []);

  const visible = useMemo(
    () => notifications.filter((n) => inFilter(n.type, filter)),
    [notifications, filter],
  );

  const open = (n: Notification) => {
    markRead(n.id);
    if (n.actionUrl) router.push(n.actionUrl);
  };

  const toggleBrowserPush = async () => {
    if (preferences.browserPush && permission === "granted") {
      updatePreferences({ browserPush: false });
      return;
    }
    const granted = await requestBrowserPermission();
    setPermission(browserPermission());
    updatePreferences({ browserPush: granted });
  };

  const pushDescription =
    permission === "unsupported"
      ? "Not supported in this browser."
      : permission === "denied"
        ? "Blocked in your browser settings."
        : permission === "granted"
          ? "Show OS notifications for important events."
          : "Allow your browser to show notifications.";

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          Home
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          Feed
        </Link>
        <Link
          href="/anchors"
          className="text-foreground/60 hover:text-foreground"
        >
          My anchors
        </Link>
        <Link
          href="/watchlist"
          className="text-foreground/60 hover:text-foreground"
        >
          Watchlist
        </Link>
        <span className="text-foreground font-medium">Notifications</span>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl">Notifications</h1>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
              {unreadCount} unread
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:border-foreground/40 transition disabled:opacity-40"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: "Clear all notifications",
                message:
                  "Clear all notifications? This removes them from this device.",
                confirmLabel: "Clear all",
                variant: "info",
              });
              if (ok) clearAll();
            }}
            disabled={notifications.length === 0}
            className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:border-foreground/40 transition disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-foreground/10">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              filter === f.id
                ? "border-heading text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<EmptyStateIcon name="bell" />}
          title={EMPTY_LABEL[filter]}
          description={EMPTY_DESCRIPTION[filter]}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => (
            <Row
              key={n.id}
              notification={n}
              onOpen={open}
              onDismiss={removeNotification}
            />
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-lg border border-foreground/10 bg-card">
        <button
          type="button"
          onClick={() => setPrefsOpen((o) => !o)}
          aria-expanded={prefsOpen}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="text-sm uppercase tracking-wide text-foreground/60">
            Preferences
          </span>
          <span className="text-sm text-foreground/50">
            {prefsOpen ? "Hide" : "Show"}
          </span>
        </button>
        {prefsOpen ? (
          <div className="space-y-4 border-t border-foreground/10 p-4">
            <PrefRow
              label="Enable notifications"
              description="Master switch for the notification center."
              checked={preferences.enabled}
              onChange={(v) => updatePreferences({ enabled: v })}
            />
            <PrefRow
              label="Browser push notifications"
              description={pushDescription}
              checked={preferences.browserPush && permission === "granted"}
              onChange={() => void toggleBrowserPush()}
              disabled={permission === "unsupported" || !preferences.enabled}
            />
            <PrefRow
              label="Sound"
              description="Play a short chime for new notifications."
              checked={preferences.sound}
              onChange={(v) => updatePreferences({ sound: v })}
              disabled={!preferences.enabled}
            />
            <div className="border-t border-foreground/10 pt-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-foreground/50">
                Notify me about
              </p>
              <div className="space-y-3">
                {TYPE_TOGGLES.map((toggle) => (
                  <PrefRow
                    key={toggle.label}
                    label={toggle.label}
                    checked={toggle.types.every((t) => preferences.types[t])}
                    onChange={(v) =>
                      updatePreferences({
                        types: Object.fromEntries(
                          toggle.types.map((t) => [t, v]),
                        ),
                      })
                    }
                    disabled={!preferences.enabled}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
