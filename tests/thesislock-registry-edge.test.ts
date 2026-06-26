import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Edge cases for the per-principal registry. register-anchor appends to an
// ordered list keyed by { owner, index } and returns the zero-based index.
// get-recent-anchors returns a fixed 10-element window, newest first; once more
// than 10 are registered the oldest fall out of the window but stay in the map.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const register = (n: number, sender: string) =>
  simnet.callPublicFn(
    "thesislock-registry",
    "register-anchor",
    [hashN(n), Cl.stringAscii(`doc-${n}`)],
    sender,
  );
const count = (owner: string) =>
  simnet.callReadOnlyFn(
    "thesislock-registry",
    "get-anchor-count",
    [Cl.principal(owner)],
    wallet1,
  );
const recent = (owner: string) =>
  simnet.callReadOnlyFn(
    "thesislock-registry",
    "get-recent-anchors",
    [Cl.principal(owner)],
    wallet1,
  );
const at = (owner: string, index: number) =>
  simnet.callReadOnlyFn(
    "thesislock-registry",
    "get-anchor-at",
    [Cl.principal(owner), Cl.uint(index)],
    wallet1,
  );

// Registers hashN(1..n) in order. Each call mines one block, so index i ends up
// holding hashN(i+1) with anchored-at h0 + i + 1.
function registerSeq(n: number, sender: string): number {
  const h0 = simnet.stacksBlockHeight;
  for (let i = 1; i <= n; i++) register(i, sender);
  return h0;
}

const indexed = (idx: number, h0: number) =>
  Cl.some(
    Cl.tuple({
      hash: hashN(idx + 1),
      label: Cl.stringAscii(`doc-${idx + 1}`),
      "anchored-at": Cl.uint(h0 + idx + 1),
    }),
  );

// The 10-element window get-recent-anchors returns for `total` registrations.
function expectedRecent(h0: number, total: number) {
  return Cl.list(
    Array.from({ length: 10 }, (_, p) => {
      const idx = total - 1 - p;
      return idx < 0 ? Cl.none() : indexed(idx, h0);
    }),
  );
}

describe("thesislock-registry edge cases", () => {
  it("returns a zero-based index from register-anchor", () => {
    expect(register(1, wallet1).result).toBeOk(Cl.uint(0));
    expect(register(2, wallet1).result).toBeOk(Cl.uint(1));
  });

  it("returns count 0 for a principal with no anchors", () => {
    expect(count(wallet1).result).toBeUint(0);
  });

  it("returns none from get-anchor-at for a principal with no anchors", () => {
    expect(at(wallet2, 0).result).toBeNone();
  });

  it("returns all none from get-recent-anchors with zero registrations", () => {
    expect(recent(wallet1).result).toStrictEqual(
      Cl.list(Array.from({ length: 10 }, () => Cl.none())),
    );
  });

  it("returns none from get-anchor-at beyond the count", () => {
    register(1, wallet1);
    expect(at(wallet1, 5).result).toBeNone();
  });

  it("stores each registration at its sequential index", () => {
    const h0 = registerSeq(3, wallet1);
    expect(at(wallet1, 0).result).toStrictEqual(indexed(0, h0));
    expect(at(wallet1, 1).result).toStrictEqual(indexed(1, h0));
    expect(at(wallet1, 2).result).toStrictEqual(indexed(2, h0));
  });

  it("returns all ten when exactly ten are registered", () => {
    const h0 = registerSeq(10, wallet1);
    expect(count(wallet1).result).toBeUint(10);
    expect(recent(wallet1).result).toStrictEqual(expectedRecent(h0, 10));
  });

  it("drops the oldest from the window once an eleventh is registered", () => {
    const h0 = registerSeq(11, wallet1);
    expect(count(wallet1).result).toBeUint(11);
    expect(recent(wallet1).result).toStrictEqual(expectedRecent(h0, 11));
    // The oldest (index 0) is still stored, just outside the recent window.
    expect(at(wallet1, 0).result).toStrictEqual(indexed(0, h0));
  });

  it("returns exactly ten after twenty registrations", () => {
    const h0 = registerSeq(20, wallet1);
    expect(count(wallet1).result).toBeUint(20);
    expect(recent(wallet1).result).toStrictEqual(expectedRecent(h0, 20));
  });

  it("keeps per-principal indexes independent", () => {
    register(1, wallet1);
    register(2, wallet1);
    register(3, wallet2);
    expect(count(wallet1).result).toBeUint(2);
    expect(count(wallet2).result).toBeUint(1);
    expect(at(wallet2, 0).result).toStrictEqual(
      Cl.some(
        Cl.tuple({
          hash: hashN(3),
          label: Cl.stringAscii("doc-3"),
          "anchored-at": Cl.uint(simnet.stacksBlockHeight),
        }),
      ),
    );
  });
});
