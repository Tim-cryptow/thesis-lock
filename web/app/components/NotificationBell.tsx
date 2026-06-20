"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/app/components/NotificationProvider";
import { NotificationIcon } from "@/app/components/NotificationIcon";
import { type Notification, NOTIFICATION_ADDED_EVENT } from "@/lib/notifications";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// Fixed bell mounted once in the root layout so it appears on every page without
// a shared nav component. Shows the unread count and a dropdown of the five most
// recent notifications.
export default function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Shake briefly whenever a new notification arrives.
  useEffect(() => {
    const onAdded = () => {
      setShake(false);
      // Restart the animation on rapid arrivals.
      requestAnimationFrame(() => setShake(true));
    };
    window.addEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
  }, []);

  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => setShake(false), 600);
    return () => window.clearTimeout(id);
  }, [shake]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const recent = notifications.slice(0, 5);
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  const openItem = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    if (n.actionUrl) router.push(n.actionUrl);
  };

  return (
    <div ref={rootRef} className="fixed right-3 top-2 z-40">
      <button
        type="button"
        data-tour="notifications-nav"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card text-foreground/70 shadow-sm hover:text-foreground hover:border-foreground/30 transition"
      >
        <span className={shake ? "bell-shake" : ""}>
          <NotificationIcon name="bell" className="h-5 w-5" />
        </span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">
              Notifications
            </span>
            {unreadCount > 0 ? (
              <span className="text-xs text-foreground/55">
                {unreadCount} unread
              </span>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-foreground/55">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-foreground/[0.03] ${
                      n.read ? "" : "bg-sky-500/[0.06]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 ${
                        n.read ? "text-foreground/45" : "text-heading"
                      }`}
                    >
                      <NotificationIcon name={n.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          n.read
                            ? "text-foreground/90"
                            : "font-semibold text-foreground"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-foreground/60">
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-foreground/40">
                        {relativeTime(n.timestamp)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-foreground/10 px-4 py-2.5 text-center text-sm text-foreground/70 hover:text-foreground transition"
          >
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
