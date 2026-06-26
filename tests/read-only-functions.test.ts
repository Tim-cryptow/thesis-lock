import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Comprehensive coverage of every read-only function across the five contracts:
// each is exercised with no data (none/default) and with valid data, and the
// counters are checked across several values.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const ro = (
  contract: string,
  fn: string,
  args: Parameters<typeof simnet.callReadOnlyFn>[2],
) => simnet.callReadOnlyFn(contract, fn, args, wallet1).result;
const anchor = (n: number) =>
  simnet.callPublicFn(
    "thesislock",
    "anchor-document",
    [hashN(n), Cl.stringAscii(`doc-${n}`)],
    wallet1,
  );
const batch = (n: number) =>
  simnet.callPublicFn(
    "thesislock-batch",
    "anchor-batch",
    [Cl.list([Cl.tuple({ hash: hashN(n), label: Cl.stringAscii(`doc-${n}`) })])],
    wallet1,
  );
const register = (n: number) =>
  simnet.callPublicFn(
    "thesislock-registry",
    "register-anchor",
    [hashN(n), Cl.stringAscii(`doc-${n}`)],
    wallet1,
  );
const mint = (n: number) =>
  simnet.callPublicFn(
    "thesislock-proof",
    "mint-proof",
    [hashN(n), Cl.stringAscii(`doc-${n}`)],
    wallet1,
  );
const createGroup = () =>
  simnet.callPublicFn(
    "thesislock-groups",
    "create-group",
    [Cl.stringAscii("g")],
    wallet1,
  );

describe("read-only functions", () => {
  describe("thesislock", () => {
    it("get-anchor returns none then some", () => {
      expect(ro("thesislock", "get-anchor", [hashN(1)])).toBeNone();
      anchor(1);
      expect(ro("thesislock", "get-anchor", [hashN(1)])).not.toBeNone();
    });
    it("is-anchored returns false then true", () => {
      expect(ro("thesislock", "is-anchored", [hashN(1)])).toBeBool(false);
      anchor(1);
      expect(ro("thesislock", "is-anchored", [hashN(1)])).toBeBool(true);
    });
  });

  describe("thesislock-batch", () => {
    it("get-batch-count is 0, then 1, then 5", () => {
      expect(ro("thesislock-batch", "get-batch-count", [])).toBeUint(0);
      batch(1);
      expect(ro("thesislock-batch", "get-batch-count", [])).toBeUint(1);
      batch(2);
      batch(3);
      batch(4);
      batch(5);
      expect(ro("thesislock-batch", "get-batch-count", [])).toBeUint(5);
    });
    it("get-batch-anchor returns none then some", () => {
      expect(
        ro("thesislock-batch", "get-batch-anchor", [
          hashN(1),
          Cl.principal(wallet1),
        ]),
      ).toBeNone();
      batch(1);
      expect(
        ro("thesislock-batch", "get-batch-anchor", [
          hashN(1),
          Cl.principal(wallet1),
        ]),
      ).not.toBeNone();
    });
  });

  describe("thesislock-registry", () => {
    it("get-anchor-count is 0, then 1, then 10", () => {
      expect(
        ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
      ).toBeUint(0);
      register(1);
      expect(
        ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
      ).toBeUint(1);
      for (let i = 2; i <= 10; i++) register(i);
      expect(
        ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
      ).toBeUint(10);
    });
    it("get-anchor-at returns none then some", () => {
      expect(
        ro("thesislock-registry", "get-anchor-at", [
          Cl.principal(wallet1),
          Cl.uint(0),
        ]),
      ).toBeNone();
      register(1);
      expect(
        ro("thesislock-registry", "get-anchor-at", [
          Cl.principal(wallet1),
          Cl.uint(0),
        ]),
      ).not.toBeNone();
    });
    it("get-recent-anchors returns a 10-element list of none when empty", () => {
      expect(
        ro("thesislock-registry", "get-recent-anchors", [Cl.principal(wallet1)]),
      ).toStrictEqual(Cl.list(Array.from({ length: 10 }, () => Cl.none())));
    });
  });

  describe("thesislock-proof", () => {
    it("get-last-token-id is ok 0, then 1, then 5", () => {
      expect(ro("thesislock-proof", "get-last-token-id", [])).toBeOk(Cl.uint(0));
      mint(1);
      expect(ro("thesislock-proof", "get-last-token-id", [])).toBeOk(Cl.uint(1));
      mint(2);
      mint(3);
      mint(4);
      mint(5);
      expect(ro("thesislock-proof", "get-last-token-id", [])).toBeOk(Cl.uint(5));
    });
    it("get-proof returns none then some", () => {
      expect(ro("thesislock-proof", "get-proof", [Cl.uint(1)])).toBeNone();
      mint(1);
      expect(ro("thesislock-proof", "get-proof", [Cl.uint(1)])).not.toBeNone();
    });
    it("get-owner is ok none then ok some", () => {
      expect(ro("thesislock-proof", "get-owner", [Cl.uint(1)])).toBeOk(
        Cl.none(),
      );
      mint(1);
      expect(ro("thesislock-proof", "get-owner", [Cl.uint(1)])).toBeOk(
        Cl.some(Cl.principal(wallet1)),
      );
    });
    it("get-token-uri returns the ok some metadata uri", () => {
      expect(ro("thesislock-proof", "get-token-uri", [Cl.uint(1)])).toBeOk(
        Cl.some(Cl.stringAscii("https://thesis-lock.vercel.app/api/nft/{id}")),
      );
    });
    it("get-token-id-by-hash and get-proof-by-hash return none then some", () => {
      expect(
        ro("thesislock-proof", "get-token-id-by-hash", [hashN(1)]),
      ).toBeNone();
      expect(ro("thesislock-proof", "get-proof-by-hash", [hashN(1)])).toBeNone();
      mint(1);
      expect(
        ro("thesislock-proof", "get-token-id-by-hash", [hashN(1)]),
      ).toBeSome(Cl.uint(1));
      expect(
        ro("thesislock-proof", "get-proof-by-hash", [hashN(1)]),
      ).not.toBeNone();
    });
  });

  describe("thesislock-groups", () => {
    it("get-group returns none then some", () => {
      expect(ro("thesislock-groups", "get-group", [Cl.uint(1)])).toBeNone();
      createGroup();
      expect(ro("thesislock-groups", "get-group", [Cl.uint(1)])).not.toBeNone();
    });
    it("is-member returns false then true", () => {
      createGroup();
      expect(
        ro("thesislock-groups", "is-member", [Cl.uint(1), Cl.principal(wallet2)]),
      ).toBeBool(false);
      simnet.callPublicFn(
        "thesislock-groups",
        "add-member",
        [Cl.uint(1), Cl.principal(wallet2)],
        wallet1,
      );
      expect(
        ro("thesislock-groups", "is-member", [Cl.uint(1), Cl.principal(wallet2)]),
      ).toBeBool(true);
    });
    it("get-group-anchor-count and get-group-anchor-at reflect anchors", () => {
      createGroup();
      expect(
        ro("thesislock-groups", "get-group-anchor-count", [Cl.uint(1)]),
      ).toBeUint(0);
      expect(
        ro("thesislock-groups", "get-group-anchor-at", [Cl.uint(1), Cl.uint(0)]),
      ).toBeNone();
      simnet.callPublicFn(
        "thesislock-groups",
        "anchor-to-group",
        [Cl.uint(1), hashN(1), Cl.stringAscii("doc-1")],
        wallet1,
      );
      expect(
        ro("thesislock-groups", "get-group-anchor-count", [Cl.uint(1)]),
      ).toBeUint(1);
      expect(
        ro("thesislock-groups", "get-group-anchor-at", [Cl.uint(1), Cl.uint(0)]),
      ).not.toBeNone();
    });
  });
});
