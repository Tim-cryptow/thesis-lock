// Client-side poller that watches pending Stacks transactions until they are
// mined. Reads go through the same public Hiro mainnet base the rest of the app
// uses. No state is persisted here; callers own that.

const HIRO_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

const POLL_INTERVAL_MS = 15_000;
const TIMEOUT_MS = 30 * 60_000;

export type TxResult = {
  txId: string;
  status: string;
  blockHeight: number | null;
  burnBlockHeight: number | null;
};

type WatchHandle = {
  timer: ReturnType<typeof setInterval>;
  deadline: ReturnType<typeof setTimeout>;
};

function withHexPrefix(txId: string): string {
  return txId.startsWith("0x") ? txId : `0x${txId}`;
}

// Statuses Hiro reports for a transaction that will never confirm. "pending"
// (and the absence of a record yet) means keep waiting.
function isFailure(status: string): boolean {
  return status.startsWith("abort_") || status.startsWith("dropped");
}

export class TxMonitor {
  private watches = new Map<string, WatchHandle>();

  watch(txId: string, onConfirm: (result: TxResult) => void, onFail: (error: Error) => void): void {
    if (this.watches.has(txId)) return;

    const poll = async () => {
      let status: string;
      let blockHeight: number | null = null;
      let burnBlockHeight: number | null = null;
      try {
        const res = await fetch(`${HIRO_BASE}/extended/v1/tx/${withHexPrefix(txId)}`);
        // 404 means the node has not indexed the tx yet; treat as still pending.
        if (res.status === 404) return;
        if (!res.ok) return;
        const data = (await res.json()) as {
          tx_status?: string;
          block_height?: number;
          burn_block_height?: number;
        };
        status = data.tx_status ?? "pending";
        blockHeight = data.block_height ?? null;
        burnBlockHeight = data.burn_block_height ?? null;
      } catch {
        // Transient network errors should not kill the watch; retry next tick.
        return;
      }

      if (status === "success") {
        this.stop(txId);
        onConfirm({ txId, status, blockHeight, burnBlockHeight });
      } else if (isFailure(status)) {
        this.stop(txId);
        onFail(new Error(`Transaction ${status}`));
      }
    };

    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    const deadline = setTimeout(() => {
      this.stop(txId);
      onFail(new Error("Timed out waiting for confirmation"));
    }, TIMEOUT_MS);

    this.watches.set(txId, { timer, deadline });
    // Check immediately so an already-mined tx resolves without a 15s wait.
    void poll();
  }

  private stop(txId: string): void {
    const handle = this.watches.get(txId);
    if (!handle) return;
    clearInterval(handle.timer);
    clearTimeout(handle.deadline);
    this.watches.delete(txId);
  }

  watchAll(): number {
    return this.watches.size;
  }

  clear(): void {
    for (const handle of this.watches.values()) {
      clearInterval(handle.timer);
      clearTimeout(handle.deadline);
    }
    this.watches.clear();
  }
}
