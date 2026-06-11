"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTxToasts, type TxNotification } from "./TxProvider";

const AUTO_DISMISS_MS = 10_000;

function truncateHash(hash: string): string {
  return hash.length <= 14 ? hash : `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function Toast({
  notification,
  onDismiss,
}: {
  notification: TxNotification;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [notification.id, onDismiss]);

  const confirmed = notification.kind === "confirmed";

  return (
    <div
      role="status"
      className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-foreground/10 bg-white p-4 shadow-lg animate-[tx-toast-in_220ms_ease-out]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {confirmed ? (
            <>
              <p className="text-sm font-medium text-heading">
                Anchor confirmed
              </p>
              <p className="mt-1 text-xs text-foreground/70">
                {notification.hash ? (
                  <code className="font-mono">
                    {truncateHash(notification.hash)}
                  </code>
                ) : (
                  "Your transaction"
                )}{" "}
                is now on block{" "}
                <span className="font-mono">
                  {notification.blockHeight ?? "chain"}
                </span>
                .
              </p>
              {notification.hash && (
                <Link
                  href={`/v/${notification.hash}`}
                  className="mt-2 inline-block text-xs underline hover:no-underline"
                  onClick={() => onDismiss(notification.id)}
                >
                  View verification
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-red-700">
                Anchor failed to confirm
              </p>
              <p className="mt-1 text-xs text-foreground/70">
                {notification.hash ? (
                  <code className="font-mono">
                    {truncateHash(notification.hash)}
                  </code>
                ) : (
                  "Your transaction"
                )}{" "}
                did not land on chain.
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss notification"
          className="shrink-0 text-foreground/40 hover:text-foreground transition"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default function TxToast() {
  const { notifications, dismiss } = useTxToasts();

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3"
    >
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}
