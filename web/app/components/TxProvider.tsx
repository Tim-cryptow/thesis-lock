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
import { TxMonitor, type TxResult } from "@/lib/txMonitor";

export type TxMetadata = {
  hash?: string;
  label?: string;
  owner?: string;
};

export type TxNotification = {
  id: string;
  kind: "confirmed" | "failed";
  hash: string | null;
  label: string | null;
  owner: string | null;
  blockHeight: number | null;
};

type PendingTx = { txId: string } & TxMetadata;

type TxContextValue = {
  trackTx: (txId: string, metadata?: TxMetadata) => void;
  pendingCount: number;
  notifications: TxNotification[];
  dismiss: (id: string) => void;
};

const SESSION_KEY = "thesislock.pendingTx";

const TxContext = createContext<TxContextValue | null>(null);

function readSession(): PendingTx[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is PendingTx => !!p && typeof (p as PendingTx).txId === "string");
  } catch {
    return [];
  }
}

function writeSession(pending: PendingTx[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(pending));
  } catch {
    // sessionStorage may be unavailable (private mode quotas); non-fatal.
  }
}

export function TxProvider({ children }: { children: React.ReactNode }) {
  const monitorRef = useRef<TxMonitor | null>(null);
  if (monitorRef.current === null) {
    monitorRef.current = new TxMonitor();
  }

  const [pending, setPending] = useState<PendingTx[]>([]);
  const [notifications, setNotifications] = useState<TxNotification[]>([]);

  const removePending = useCallback((txId: string) => {
    setPending((prev) => {
      const next = prev.filter((p) => p.txId !== txId);
      writeSession(next);
      return next;
    });
  }, []);

  const startWatch = useCallback(
    (tx: PendingTx) => {
      const monitor = monitorRef.current!;
      monitor.watch(
        tx.txId,
        (result: TxResult) => {
          removePending(tx.txId);
          setNotifications((prev) => [
            ...prev,
            {
              id: tx.txId,
              kind: "confirmed",
              hash: tx.hash ?? null,
              label: tx.label ?? null,
              owner: tx.owner ?? null,
              blockHeight: result.blockHeight,
            },
          ]);
        },
        () => {
          removePending(tx.txId);
          setNotifications((prev) => [
            ...prev,
            {
              id: tx.txId,
              kind: "failed",
              hash: tx.hash ?? null,
              label: tx.label ?? null,
              owner: tx.owner ?? null,
              blockHeight: null,
            },
          ]);
        },
      );
    },
    [removePending],
  );

  // Rehydrate any transactions that were still pending when the user navigated.
  // sessionStorage clears on browser close, so stale watches do not pile up.
  useEffect(() => {
    const monitor = monitorRef.current!;
    const restored = readSession();
    if (restored.length > 0) {
      setPending(restored);
      restored.forEach(startWatch);
    }
    return () => monitor.clear();
  }, [startWatch]);

  const trackTx = useCallback(
    (txId: string, metadata?: TxMetadata) => {
      const tx: PendingTx = { txId, ...metadata };
      setPending((prev) => {
        if (prev.some((p) => p.txId === txId)) return prev;
        const next = [...prev, tx];
        writeSession(next);
        return next;
      });
      startWatch(tx);
    },
    [startWatch],
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value = useMemo<TxContextValue>(
    () => ({
      trackTx,
      pendingCount: pending.length,
      notifications,
      dismiss,
    }),
    [trackTx, pending.length, notifications, dismiss],
  );

  return <TxContext.Provider value={value}>{children}</TxContext.Provider>;
}

export function useTx(): TxContextValue {
  const ctx = useContext(TxContext);
  if (!ctx) {
    throw new Error("useTx must be used within a TxProvider");
  }
  return ctx;
}

export function useTxToasts(): {
  notifications: TxNotification[];
  dismiss: (id: string) => void;
} {
  const { notifications, dismiss } = useTx();
  return { notifications, dismiss };
}
