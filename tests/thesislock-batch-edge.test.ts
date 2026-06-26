import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Edge cases for the batch contract. anchor-batch takes up to 10 entries,
// increments a global counter once per call (not per entry), and inserts each
// { hash, owner } row with map-insert so duplicates are silently skipped. The
// list type caps the call at 10 entries, so 11 is rejected at the type boundary.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const entry = (n: number, label = `doc-${n}`) =>
  Cl.tuple({ hash: hashN(n), label: Cl.stringAscii(label) });
const anchorBatch = (entries: ReturnType<typeof entry>[], sender: string) =>
  simnet.callPublicFn(
    "thesislock-batch",
    "anchor-batch",
    [Cl.list(entries)],
    sender,
  );
const getAnchor = (n: number, owner: string) =>
  simnet.callReadOnlyFn(
    "thesislock-batch",
    "get-batch-anchor",
    [hashN(n), Cl.principal(owner)],
    wallet1,
  );
const getCount = () =>
  simnet.callReadOnlyFn("thesislock-batch", "get-batch-count", [], wallet1);

// The stored record for the most recent batch call (reads the current heights).
const stored = (label: string, batchId: number) =>
  Cl.tuple({
    label: Cl.stringAscii(label),
    "stacks-block": Cl.uint(simnet.stacksBlockHeight),
    "burn-block": Cl.uint(simnet.burnBlockHeight),
    "batch-id": Cl.uint(batchId),
  });

describe("thesislock-batch edge cases", () => {
  it("accepts an empty batch and still increments the counter", () => {
    expect(anchorBatch([], wallet1).result).toBeOk(Cl.uint(1));
    expect(getCount().result).toBeUint(1);
  });

  it("anchors a single entry", () => {
    expect(anchorBatch([entry(1)], wallet1).result).toBeOk(Cl.uint(1));
    expect(getAnchor(1, wallet1).result).toBeSome(stored("doc-1", 1));
  });

  it("anchors exactly ten entries in one call", () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry(i + 1));
    expect(anchorBatch(entries, wallet1).result).toBeOk(Cl.uint(1));
    expect(getAnchor(1, wallet1).result).toBeSome(stored("doc-1", 1));
    expect(getAnchor(10, wallet1).result).toBeSome(stored("doc-10", 1));
    expect(getCount().result).toBeUint(1);
  });

  it("rejects more than ten entries at the type boundary", () => {
    const entries = Array.from({ length: 11 }, (_, i) => entry(i + 1));
    expect(() => anchorBatch(entries, wallet1)).toThrow();
  });

  it("skips duplicate hashes within one call without erroring", () => {
    expect(
      anchorBatch(
        [entry(1, "first"), entry(1, "second"), entry(2, "other")],
        wallet1,
      ).result,
    ).toBeOk(Cl.uint(1));
    expect(getAnchor(1, wallet1).result).toBeSome(stored("first", 1));
    expect(getAnchor(2, wallet1).result).toBeSome(stored("other", 1));
  });

  it("increments the counter once per call, not per entry", () => {
    anchorBatch([entry(1), entry(2), entry(3), entry(4), entry(5)], wallet1);
    anchorBatch([entry(6), entry(7), entry(8)], wallet1);
    expect(getCount().result).toBeUint(2);
  });

  it("assigns the same batch-id to every entry in a call", () => {
    expect(anchorBatch([entry(1), entry(2), entry(3)], wallet1).result).toBeOk(
      Cl.uint(1),
    );
    expect(getAnchor(1, wallet1).result).toBeSome(stored("doc-1", 1));
    expect(getAnchor(2, wallet1).result).toBeSome(stored("doc-2", 1));
    expect(getAnchor(3, wallet1).result).toBeSome(stored("doc-3", 1));
  });

  it("keeps the first record when the same owner re-batches a hash", () => {
    expect(anchorBatch([entry(1, "first")], wallet1).result).toBeOk(Cl.uint(1));
    const firstStacks = simnet.stacksBlockHeight;
    const firstBurn = simnet.burnBlockHeight;
    expect(anchorBatch([entry(1, "second")], wallet1).result).toBeOk(Cl.uint(2));
    expect(getAnchor(1, wallet1).result).toBeSome(
      Cl.tuple({
        label: Cl.stringAscii("first"),
        "stacks-block": Cl.uint(firstStacks),
        "burn-block": Cl.uint(firstBurn),
        "batch-id": Cl.uint(1),
      }),
    );
  });

  it("lets different owners anchor the same hash independently", () => {
    expect(anchorBatch([entry(1, "owner-one")], wallet1).result).toBeOk(
      Cl.uint(1),
    );
    const s1 = simnet.stacksBlockHeight;
    const b1 = simnet.burnBlockHeight;
    expect(anchorBatch([entry(1, "owner-two")], wallet2).result).toBeOk(
      Cl.uint(2),
    );
    expect(getAnchor(1, wallet1).result).toBeSome(
      Cl.tuple({
        label: Cl.stringAscii("owner-one"),
        "stacks-block": Cl.uint(s1),
        "burn-block": Cl.uint(b1),
        "batch-id": Cl.uint(1),
      }),
    );
    expect(getAnchor(1, wallet2).result).toBeSome(stored("owner-two", 2));
  });

  it("returns none for a hash that was never batched", () => {
    expect(getAnchor(99, wallet1).result).toBeNone();
  });
});
