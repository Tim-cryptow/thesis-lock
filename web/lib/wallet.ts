"use client";

import { useEffect, useState, useCallback } from "react";
import { connect, disconnect, getLocalStorage, isConnected } from "@stacks/connect";

export function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

function readStxAddress(): string | null {
  if (typeof window === "undefined") return null;
  if (!isConnected()) return null;
  const data = getLocalStorage();
  const stx = data?.addresses?.stx;
  if (!stx || stx.length === 0) return null;
  return stx[0].address;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAddress(readStxAddress());
  }, []);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      await connect();
      setAddress(readStxAddress());
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        /cancel|reject|denied|closed/i.test(message)
          ? "Wallet connection was cancelled."
          : "Could not connect. Make sure a Stacks wallet (Leather, Xverse, or Asigna) is installed.",
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setAddress(null);
    setError(null);
  }, []);

  return { address, connecting, error, connectWallet, disconnectWallet };
}
