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

  useEffect(() => {
    setAddress(readStxAddress());
  }, []);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      await connect();
      setAddress(readStxAddress());
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setAddress(null);
  }, []);

  return { address, connecting, connectWallet, disconnectWallet };
}
