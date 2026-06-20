"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Notification,
  type NotificationPreferences,
  addNotification as addNotificationStore,
  clearAll as clearAllStore,
  loadNotifications,
  loadPreferences,
  markAllRead as markAllReadStore,
  markRead as markReadStore,
  savePreferences,
  sendBrowserNotification,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATION_ADDED_EVENT,
} from "@/lib/notifications";

type NewNotification = Omit<Notification, "id" | "timestamp" | "read">;

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (input: NewNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  updatePreferences: (patch: Partial<NotificationPreferences>) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Single hub for the notification center. It holds the React-visible copy of the
// localStorage-backed list and preferences, re-reading whenever any source fires
// a change event (including other tabs via the storage event). Sources elsewhere
// in the app call the lib addNotification directly; this provider only needs to
// react to the resulting events, so it does not have to be their parent.
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(loadPreferences);

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

  const addNotification = useCallback((input: NewNotification) => {
    addNotificationStore(input);
  }, []);

  const markRead = useCallback((id: string) => markReadStore(id), []);
  const markAllRead = useCallback(() => markAllReadStore(), []);
  const clearAll = useCallback(() => clearAllStore(), []);

  const updatePreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setPreferences((prev) => {
        const next: NotificationPreferences = {
          ...prev,
          ...patch,
          types: { ...prev.types, ...(patch.types ?? {}) },
        };
        savePreferences(next);
        return next;
      });
    },
    [],
  );

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
      clearAll,
      updatePreferences,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return ctx;
}
