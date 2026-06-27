"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Notification,
  type NotificationPreferences,
  type NotificationType,
  addNotification as addNotificationStore,
  clearAll as clearAllStore,
  loadNotifications,
  loadPreferences,
  markAllRead as markAllReadStore,
  markRead as markReadStore,
  removeNotification as removeNotificationStore,
  savePreferences,
  sendBrowserNotification,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATION_ADDED_EVENT,
} from "@/lib/notifications";
import { useTx } from "@/app/components/TxProvider";
import { useLive } from "@/app/components/LiveProvider";

type NewNotification = Omit<Notification, "id" | "timestamp" | "read">;

// A patch can flip the master toggles and any subset of per-type toggles.
type PreferencesPatch = Partial<Omit<NotificationPreferences, "types">> & {
  types?: Partial<Record<NotificationType, boolean>>;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (input: NewNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (patch: PreferencesPatch) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Single hub for the notification center. It holds the React-visible copy of the
// localStorage-backed list and preferences, re-reading whenever any source fires
// a change event (including other tabs via the storage event). Sources elsewhere
// in the app call the lib addNotification directly; this provider only needs to
// react to the resulting events, so it does not have to be their parent.
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(loadPreferences);
  const { notifications: txNotifications } = useTx();
  const seenTxRef = useRef<Set<string>>(new Set());
  const { events: liveEvents } = useLive();
  const seenLiveRef = useRef<Set<string>>(new Set());
  const liveBaselinedRef = useRef(false);

  // Hydrate from storage on mount and keep in sync with every change event.
  useEffect(() => {
    setNotifications(loadNotifications());
    setPreferences(loadPreferences());
    const sync = () => {
      setNotifications(loadNotifications());
      setPreferences(loadPreferences());
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Fire a browser push for high-priority notifications when the user has opted
  // in. addNotification already enforced the master and per-type preferences, so
  // this only has to gate on browserPush and priority.
  useEffect(() => {
    const onAdded = (event: Event) => {
      const detail = (event as CustomEvent<Notification>).detail;
      if (!detail) return;
      const prefs = loadPreferences();
      if (prefs.enabled && prefs.browserPush && detail.priority === "high") {
        sendBrowserNotification(detail.title, detail.message, detail.actionUrl);
      }
    };
    window.addEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
  }, []);

  // Mirror transaction confirmations and failures into the notification center,
  // once each (deduped by transaction id, which TxProvider uses as the id).
  useEffect(() => {
    for (const tx of txNotifications) {
      if (seenTxRef.current.has(tx.id)) continue;
      seenTxRef.current.add(tx.id);
      if (tx.kind === "confirmed") {
        addNotificationStore({
          type: "tx_confirmed",
          title: "Transaction confirmed",
          message: tx.label
            ? `"${tx.label}" is now anchored on chain.`
            : "Your transaction is confirmed on chain.",
          icon: "success",
          priority: "medium",
          actionUrl: tx.hash
            ? tx.owner
              ? `/v/${tx.hash}?owner=${encodeURIComponent(tx.owner)}`
              : `/v/${tx.hash}`
            : undefined,
          actionLabel: tx.hash ? "View anchor" : undefined,
        });
      } else {
        addNotificationStore({
          type: "tx_failed",
          title: "Transaction failed",
          message: tx.label
            ? `"${tx.label}" did not confirm. Please try again.`
            : "Your transaction did not confirm. Please try again.",
          icon: "error",
          priority: "high",
        });
      }
    }
  }, [txNotifications]);

  // Turn new on-chain anchor events from the live poller into low-priority
  // notifications. Baseline the buffer that already exists on mount so opening
  // the app does not replay history; only events arriving afterwards notify.
  useEffect(() => {
    if (!liveBaselinedRef.current) {
      liveBaselinedRef.current = true;
      for (const ev of liveEvents) seenLiveRef.current.add(ev.id);
      return;
    }
    for (const ev of liveEvents) {
      if (seenLiveRef.current.has(ev.id)) continue;
      seenLiveRef.current.add(ev.id);
      if (!ev.hash) continue;
      if (ev.kind === "anchor") {
        addNotificationStore({
          type: "new_anchor",
          title: "New anchor",
          message: ev.label ? `New anchor: "${ev.label}"` : "A new document was anchored on chain.",
          icon: "anchor",
          priority: "low",
          actionUrl: `/v/${ev.hash}`,
          actionLabel: "Verify",
        });
      } else if (ev.kind === "proof") {
        addNotificationStore({
          type: "proof_minted",
          title: "Proof minted",
          message: ev.label
            ? `A proof NFT was minted: "${ev.label}"`
            : "A proof NFT was minted on chain.",
          icon: "proof",
          priority: "low",
          actionUrl: `/v/${ev.hash}`,
          actionLabel: "Verify",
        });
      }
    }
  }, [liveEvents]);

  const addNotification = useCallback((input: NewNotification) => {
    addNotificationStore(input);
  }, []);

  const markRead = useCallback((id: string) => markReadStore(id), []);
  const markAllRead = useCallback(() => markAllReadStore(), []);
  const removeNotification = useCallback((id: string) => removeNotificationStore(id), []);
  const clearAll = useCallback(() => clearAllStore(), []);

  const updatePreferences = useCallback((patch: PreferencesPatch) => {
    setPreferences((prev) => {
      const next: NotificationPreferences = {
        ...prev,
        ...patch,
        types: { ...prev.types, ...(patch.types ?? {}) },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((count, n) => (n.read ? count : count + 1), 0),
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      preferences,
      addNotification,
      markRead,
      markAllRead,
      removeNotification,
      clearAll,
      updatePreferences,
    }),
    [
      notifications,
      unreadCount,
      preferences,
      addNotification,
      markRead,
      markAllRead,
      removeNotification,
      clearAll,
      updatePreferences,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
