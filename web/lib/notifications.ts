// Storage and helpers for the unified notification center. The browser is the
// only source of truth: notifications and preferences live in localStorage, and
// every mutation dispatches a window event so any open provider, bell, page, or
// sound component stays in sync, regardless of which part of the app created the
// notification. No server, no external state.

export type NotificationType =
  | "tx_confirmed"
  | "tx_failed"
  | "watchlist_update"
  | "new_anchor"
  | "group_invite"
  | "proof_minted"
  | "system";

export type NotificationPriority = "low" | "medium" | "high";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  // ISO timestamp of when the notification was created.
  timestamp: string;
  read: boolean;
  // Optional in-app link the item navigates to when clicked.
  actionUrl?: string;
  actionLabel?: string;
  // Icon name resolved to an inline SVG by the UI (never an emoji).
  icon: string;
  priority: NotificationPriority;
};

export type NotificationPreferences = {
  enabled: boolean;
  browserPush: boolean;
  sound: boolean;
  types: Record<NotificationType, boolean>;
};

const STORAGE_KEY = "thesislock.notifications";
const PREFS_KEY = "thesislock.notifications.prefs";
// Keep at most this many notifications, newest first; older ones are dropped.
const CAP = 200;

// Fired whenever the stored notification list changes (add, read, clear).
export const NOTIFICATIONS_CHANGED_EVENT = "thesislock:notifications-changed";
// Fired only when a brand new notification is added, with the notification as
// the event detail. Sound and browser push hang off this so they never fire on
// a read/clear.
export const NOTIFICATION_ADDED_EVENT = "thesislock:notification-added";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "tx_confirmed",
  "tx_failed",
  "watchlist_update",
  "new_anchor",
  "group_invite",
  "proof_minted",
  "system",
];

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function emit(name: string, detail?: unknown): void {
  if (!canUseDom()) return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // CustomEvent may be unavailable in exotic environments; non-fatal.
  }
}

function defaultPreferences(): NotificationPreferences {
  const types = {} as Record<NotificationType, boolean>;
  for (const t of NOTIFICATION_TYPES) types[t] = true;
  return { enabled: true, browserPush: true, sound: true, types };
}

function isNotification(value: unknown): value is Notification {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.type === "string" &&
    typeof n.title === "string" &&
    typeof n.message === "string" &&
    typeof n.timestamp === "string" &&
    typeof n.read === "boolean" &&
    typeof n.icon === "string" &&
    typeof n.priority === "string"
  );
}

function newId(): string {
  if (canUseDom() && typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the manual id
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadNotifications(): Notification[] {
  if (!canUseDom()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNotification);
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: Notification[]): void {
  if (!canUseDom()) return;
  try {
    // Stored newest first; cap the tail so storage cannot grow unbounded.
    const capped = notifications.slice(0, CAP);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    emit(NOTIFICATIONS_CHANGED_EVENT);
  } catch {
    // localStorage may be full or unavailable (private mode); non-fatal.
  }
}

export function loadPreferences(): NotificationPreferences {
  const defaults = defaultPreferences();
  if (!canUseDom()) return defaults;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences> | null;
    if (!parsed || typeof parsed !== "object") return defaults;
    return {
      enabled: parsed.enabled ?? defaults.enabled,
      browserPush: parsed.browserPush ?? defaults.browserPush,
      sound: parsed.sound ?? defaults.sound,
      types: { ...defaults.types, ...(parsed.types ?? {}) },
    };
  } catch {
    return defaults;
  }
}

export function savePreferences(prefs: NotificationPreferences): void {
  if (!canUseDom()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    emit(NOTIFICATIONS_CHANGED_EVENT);
  } catch {
    // non-fatal
  }
}

// Add a notification, respecting the master and per-type preferences. When the
// type is muted the notification is neither stored nor announced, and the
// returned object is informational only (callers fire and forget). On success
// it persists newest-first and fires both the changed and added events.
export function addNotification(
  input: Omit<Notification, "id" | "timestamp" | "read">,
): Notification {
  const notification: Notification = {
    ...input,
    id: newId(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  const prefs = loadPreferences();
  if (!prefs.enabled || prefs.types[input.type] === false) {
    return notification;
  }
  const next = [notification, ...loadNotifications()].slice(0, CAP);
  saveNotifications(next);
  emit(NOTIFICATION_ADDED_EVENT, notification);
  return notification;
}

export function markRead(id: string): void {
  const list = loadNotifications();
  let changed = false;
  const next = list.map((n) => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) saveNotifications(next);
}

export function markAllRead(): void {
  const list = loadNotifications();
  if (!list.some((n) => !n.read)) return;
  saveNotifications(list.map((n) => (n.read ? n : { ...n, read: true })));
}

export function clearAll(): void {
  if (loadNotifications().length === 0) return;
  saveNotifications([]);
}

export function removeNotification(id: string): void {
  const list = loadNotifications();
  if (!list.some((n) => n.id === id)) return;
  saveNotifications(list.filter((n) => n.id !== id));
}

export function getUnreadCount(): number {
  return loadNotifications().filter((n) => !n.read).length;
}

// Browser push helpers. Both are no-ops when the Notification API is missing or
// permission has not been granted, so callers never need to feature-detect.

export function browserPermission(): NotificationPermission | "unsupported" {
  if (!canUseDom() || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function requestBrowserPermission(): Promise<boolean> {
  if (!canUseDom() || !("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission()
    .then((result) => result === "granted")
    .catch(() => false);
}

export function sendBrowserNotification(title: string, body: string, url?: string): void {
  if (!canUseDom() || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
    if (url) {
      notification.onclick = () => {
        try {
          window.focus();
          window.location.assign(url);
        } catch {
          // navigation best effort
        }
      };
    }
  } catch {
    // Constructing a Notification can throw on some platforms; non-fatal.
  }
}
