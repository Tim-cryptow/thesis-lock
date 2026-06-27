import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The watchlist resolves on-chain status through ./stacks and ./search and
// emits notifications through ./notifications. Mock all three so the unit tests
// never touch the network and checkWatch is deterministic.
vi.mock("../stacks", () => ({
  readAnchor: vi.fn(),
  readBatchAnchor: vi.fn(),
  getProofByHash: vi.fn(),
  getAnchorCount: vi.fn(),
  getGroup: vi.fn(),
  getGroupAnchorAt: vi.fn(),
  getGroupAnchorCount: vi.fn(),
}));
vi.mock("../search", () => ({
  discoverBatchAndGroupAnchors: vi.fn(async () => new Map()),
}));
vi.mock("../notifications", () => ({
  addNotification: vi.fn(),
}));

import * as stacks from "../stacks";
import {
  addWatch,
  removeWatch,
  removeWatchByValue,
  isWatched,
  setWatchNotifications,
  normalizeWatchValue,
  loadWatchlist,
  applyCheck,
  mergeChecked,
  countWatchUpdates,
  checkWatch,
} from "../watchlist";
import { installMemoryStorage } from "./memoryStorage";

const H1 = "a".repeat(64);
const WALLET = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

beforeEach(() => {
  installMemoryStorage();
  vi.clearAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("normalizeWatchValue", () => {
  it("normalizes hashes, wallets, and groups by type", () => {
    expect(normalizeWatchValue("hash", `0x${H1.toUpperCase()}`)).toBe(H1);
    expect(normalizeWatchValue("wallet", WALLET.toLowerCase())).toBe(WALLET);
    expect(normalizeWatchValue("group", "  5 ")).toBe("5");
  });
});

describe("addWatch / isWatched / loadWatchlist", () => {
  it("starts empty", () => {
    expect(loadWatchlist()).toEqual([]);
  });

  it("adds a watch and reports it as watched", () => {
    const item = addWatch("hash", H1, "My doc");
    expect(item.value).toBe(H1);
    expect(item.notifications).toBe(true);
    expect(isWatched("hash", H1)).toBe(true);
    expect(loadWatchlist()).toHaveLength(1);
  });

  it("returns the existing item instead of adding a duplicate", () => {
    const first = addWatch("hash", H1, "A");
    const second = addWatch("hash", H1, "B");
    expect(second.id).toBe(first.id);
    expect(loadWatchlist()).toHaveLength(1);
  });
});

describe("removeWatch / removeWatchByValue / setWatchNotifications", () => {
  it("removes a watch by id", () => {
    const item = addWatch("hash", H1, "x");
    removeWatch(item.id);
    expect(loadWatchlist()).toEqual([]);
  });

  it("removes a watch by type and value", () => {
    addWatch("wallet", WALLET, "Me");
    removeWatchByValue("wallet", WALLET.toLowerCase());
    expect(isWatched("wallet", WALLET)).toBe(false);
  });

  it("toggles per-item notifications", () => {
    const item = addWatch("hash", H1, "x");
    setWatchNotifications(item.id, false);
    expect(loadWatchlist()[0]!.notifications).toBe(false);
  });
});

describe("applyCheck", () => {
  it("stamps the status and backfills context for a bare hash", () => {
    const item = addWatch("hash", H1, "x");
    const next = applyCheck(item, {
      verified: true,
      source: "batch",
      block: 50,
      owner: WALLET,
      newAnchors: 0,
    });
    expect(next.lastChecked).not.toBeNull();
    expect(next.lastStatus?.verified).toBe(true);
    expect(next.context?.owner).toBe(WALLET);
  });
});

describe("mergeChecked / countWatchUpdates", () => {
  it("applies freshly checked items onto the stored list by id", () => {
    const item = addWatch("hash", H1, "x");
    const merged = mergeChecked([
      { ...item, lastChecked: item.addedAt, lastStatus: { verified: true, newAnchors: 0 } },
    ]);
    expect(merged.find((m) => m.id === item.id)?.lastStatus?.verified).toBe(true);
  });

  it("counts only notifying items that gained anchors", () => {
    const base = addWatch("wallet", WALLET, "w");
    const items = [
      { ...base, notifications: true, lastStatus: { verified: true, newAnchors: 2 } },
      { ...base, id: "x", notifications: true, lastStatus: { verified: true, newAnchors: 0 } },
      { ...base, id: "y", notifications: false, lastStatus: { verified: true, newAnchors: 9 } },
    ];
    expect(countWatchUpdates(items)).toBe(1);
  });
});

describe("checkWatch", () => {
  it("reports a hash as verified from a single anchor", async () => {
    vi.mocked(stacks.readAnchor).mockResolvedValue({
      anchoredBy: WALLET,
      stacksBlock: 100,
      burnBlock: 90,
      label: "x",
    });
    const status = await checkWatch(addWatch("hash", H1, "doc"));
    expect(status.verified).toBe(true);
    expect(status.source).toBe("single");
    expect(status.block).toBe(100);
  });

  it("reports a hash as unverified when no anchor is found", async () => {
    vi.mocked(stacks.readAnchor).mockResolvedValue(null);
    vi.mocked(stacks.getProofByHash).mockResolvedValue(null);
    const status = await checkWatch(addWatch("hash", H1, "doc"));
    expect(status.verified).toBe(false);
  });
});
