import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hexOf = (c: string) => c.repeat(64);
const hashOf = (c: string) => Cl.bufferFromHex(hexOf(c));

const entry = (c: string, label: string) =>
  Cl.tuple({ hash: hashOf(c), label: Cl.stringAscii(label) });

describe("thesislock-batch", () => {
  describe("anchor-batch", () => {
    it("anchors a single-entry batch and returns (ok u1)", () => {
      const { result } = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "doc-a")])],
        wallet1,
      );
      expect(result).toBeOk(Cl.uint(1));
    });

    it("anchors a full 10-item batch and writes every entry", () => {
      const chars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "a"];
      const items = chars.map((c, i) => entry(c, `doc-${i}`));
      const { result } = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list(items)],
        wallet1,
      );
      expect(result).toBeOk(Cl.uint(1));

      for (const c of chars) {
        const got = simnet.callReadOnlyFn(
          "thesislock-batch",
          "get-batch-anchor",
          [hashOf(c), Cl.principal(wallet1)],
          wallet1,
        );
        expect(got.result).not.toBeNone();
      }
    });

    it("increments batch-counter once per call, not once per entry", () => {
      simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "x"), entry("b", "y"), entry("c", "z")])],
        wallet1,
      );
      simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("d", "x"), entry("e", "y")])],
        wallet2,
      );
      const { result } = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-count",
        [],
        wallet1,
      );
      expect(result).toBeUint(2);
    });

    it("silently skips duplicate hashes for the same owner, keeping the first record", () => {
      const stacks1 = simnet.stacksBlockHeight;
      const burn1 = simnet.burnBlockHeight;
      const first = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "first")])],
        wallet1,
      );
      expect(first.result).toBeOk(Cl.uint(1));

      const stacks2 = simnet.stacksBlockHeight;
      const burn2 = simnet.burnBlockHeight;
      const second = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "second"), entry("b", "new")])],
        wallet1,
      );
      expect(second.result).toBeOk(Cl.uint(2));

      const aRecord = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("a"), Cl.principal(wallet1)],
        wallet1,
      );
      expect(aRecord.result).toBeSome(
        Cl.tuple({
          label: Cl.stringAscii("first"),
          "stacks-block": Cl.uint(stacks1 + 1),
          "burn-block": Cl.uint(burn1),
          "batch-id": Cl.uint(1),
        }),
      );

      const bRecord = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("b"), Cl.principal(wallet1)],
        wallet1,
      );
      expect(bRecord.result).toBeSome(
        Cl.tuple({
          label: Cl.stringAscii("new"),
          "stacks-block": Cl.uint(stacks2 + 1),
          "burn-block": Cl.uint(burn2),
          "batch-id": Cl.uint(2),
        }),
      );
    });

    it("allows the same hash to be anchored by two different owners", () => {
      const r1 = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "by-w1")])],
        wallet1,
      );
      const r2 = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "by-w2")])],
        wallet2,
      );
      expect(r1.result).toBeOk(Cl.uint(1));
      expect(r2.result).toBeOk(Cl.uint(2));

      const a1 = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("a"), Cl.principal(wallet1)],
        wallet1,
      );
      const a2 = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("a"), Cl.principal(wallet2)],
        wallet1,
      );
      expect(a1.result).not.toBeNone();
      expect(a2.result).not.toBeNone();
    });

    it("emits a batch-anchored print event", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      const burnBefore = simnet.burnBlockHeight;
      const { result, events } = simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "x"), entry("b", "y"), entry("c", "z")])],
        wallet1,
      );
      expect(result).toBeOk(Cl.uint(1));
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.event).toBe("print_event");
      expect(evt.data.value).toStrictEqual(
        Cl.tuple({
          event: Cl.stringAscii("batch-anchored"),
          "batch-id": Cl.uint(1),
          owner: Cl.principal(wallet1),
          count: Cl.uint(3),
          "stacks-block": Cl.uint(stacksBefore + 1),
          "burn-block": Cl.uint(burnBefore),
        }),
      );
    });
  });

  describe("get-batch-anchor", () => {
    it("returns none for an unknown { hash, owner }", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("a"), Cl.principal(wallet1)],
        wallet1,
      );
      expect(result).toBeNone();
    });

    it("returns the stored record with all fields after anchoring", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      const burnBefore = simnet.burnBlockHeight;
      simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([entry("a", "doc-a")])],
        wallet1,
      );
      const { result } = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashOf("a"), Cl.principal(wallet1)],
        wallet1,
      );
      expect(result).toBeSome(
        Cl.tuple({
          label: Cl.stringAscii("doc-a"),
          "stacks-block": Cl.uint(stacksBefore + 1),
          "burn-block": Cl.uint(burnBefore),
          "batch-id": Cl.uint(1),
        }),
      );
    });
  });

  describe("get-batch-count", () => {
    it("starts at u0", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-count",
        [],
        wallet1,
      );
      expect(result).toBeUint(0);
    });
  });
});
