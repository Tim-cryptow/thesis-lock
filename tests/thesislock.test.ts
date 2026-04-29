import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const HASH_A_HEX = "a".repeat(64);
const HASH_B_HEX = "b".repeat(64);
const LABEL_NORMAL = "thesis-chapter-3";
const LABEL_EMPTY = "";
const LABEL_MAX = "x".repeat(64);

const hashA = Cl.bufferFromHex(HASH_A_HEX);
const hashB = Cl.bufferFromHex(HASH_B_HEX);

describe("thesislock", () => {
  describe("anchor-document", () => {
    it("succeeds for a fresh hash with a valid label and returns (ok true)", () => {
      const { result } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("returns (err u100) when re-anchoring the same hash", () => {
      simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      const { result } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii("a-different-label")],
        wallet2,
      );
      expect(result).toBeErr(Cl.uint(100));
    });

    it("accepts an empty label", () => {
      const { result } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_EMPTY)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts a 64-character label", () => {
      const { result } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_MAX)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows two different hashes to be anchored independently", () => {
      const { result: r1 } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      const { result: r2 } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashB, Cl.stringAscii("another-doc")],
        wallet2,
      );
      expect(r1).toBeOk(Cl.bool(true));
      expect(r2).toBeOk(Cl.bool(true));

      const isAnchoredA = simnet.callReadOnlyFn(
        "thesislock",
        "is-anchored",
        [hashA],
        wallet1,
      );
      const isAnchoredB = simnet.callReadOnlyFn(
        "thesislock",
        "is-anchored",
        [hashB],
        wallet1,
      );
      expect(isAnchoredA.result).toBeBool(true);
      expect(isAnchoredB.result).toBeBool(true);
    });

    it("emits a print event with the anchor-created shape on success", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      const burnBefore = simnet.burnBlockHeight;
      const { result, events } = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      expect(result).toBeOk(Cl.bool(true));
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.event).toBe("print_event");
      expect(evt.data.value).toStrictEqual(
        Cl.tuple({
          event: Cl.stringAscii("anchor-created"),
          hash: hashA,
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(stacksBefore + 1),
          "burn-block": Cl.uint(burnBefore),
          label: Cl.stringAscii(LABEL_NORMAL),
        }),
      );
    });
  });

  describe("get-anchor", () => {
    it("returns none for an unknown hash", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock",
        "get-anchor",
        [hashA],
        wallet1,
      );
      expect(result).toBeNone();
    });

    it("returns some(record) with the correct fields after anchoring", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      const burnBefore = simnet.burnBlockHeight;
      simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      const { result } = simnet.callReadOnlyFn(
        "thesislock",
        "get-anchor",
        [hashA],
        wallet1,
      );
      expect(result).toBeSome(
        Cl.tuple({
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(stacksBefore + 1),
          "burn-block": Cl.uint(burnBefore),
          label: Cl.stringAscii(LABEL_NORMAL),
        }),
      );
    });
  });

  describe("is-anchored", () => {
    it("returns false before the hash is anchored", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock",
        "is-anchored",
        [hashA],
        wallet1,
      );
      expect(result).toBeBool(false);
    });

    it("returns true after the hash is anchored", () => {
      simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashA, Cl.stringAscii(LABEL_NORMAL)],
        wallet1,
      );
      const { result } = simnet.callReadOnlyFn(
        "thesislock",
        "is-anchored",
        [hashA],
        wallet1,
      );
      expect(result).toBeBool(true);
    });
  });
});
