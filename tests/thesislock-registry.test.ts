import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hexOf = (c: string) => c.repeat(64);
const hashOf = (c: string) => Cl.bufferFromHex(hexOf(c));

const register = (sender: string, hashChar: string, label: string) =>
  simnet.callPublicFn(
    "thesislock-registry",
    "register-anchor",
    [hashOf(hashChar), Cl.stringAscii(label)],
    sender,
  );

const tenNone = () =>
  Cl.list([
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
    Cl.none(),
  ]);

describe("thesislock-registry", () => {
  describe("register-anchor", () => {
    it("returns (ok u0) for the first registration", () => {
      const { result } = register(wallet1, "a", "doc-a");
      expect(result).toBeOk(Cl.uint(0));
    });

    it("returns the prior count, incrementing per call", () => {
      const r0 = register(wallet1, "a", "doc-0");
      const r1 = register(wallet1, "b", "doc-1");
      const r2 = register(wallet1, "c", "doc-2");
      expect(r0.result).toBeOk(Cl.uint(0));
      expect(r1.result).toBeOk(Cl.uint(1));
      expect(r2.result).toBeOk(Cl.uint(2));
    });

    it("tracks counts per-principal independently", () => {
      register(wallet1, "a", "w1-0");
      register(wallet1, "b", "w1-1");
      register(wallet2, "c", "w2-0");
      const c1 = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-count",
        [Cl.principal(wallet1)],
        wallet1,
      );
      const c2 = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-count",
        [Cl.principal(wallet2)],
        wallet1,
      );
      expect(c1.result).toBeUint(2);
      expect(c2.result).toBeUint(1);
    });

    it("emits an anchor-registered print event with the assigned index", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      const { events } = register(wallet1, "a", "doc-a");
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.event).toBe("print_event");
      expect(evt.data.value).toStrictEqual(
        Cl.tuple({
          event: Cl.stringAscii("anchor-registered"),
          owner: Cl.principal(wallet1),
          index: Cl.uint(0),
          hash: hashOf("a"),
          label: Cl.stringAscii("doc-a"),
          "anchored-at": Cl.uint(stacksBefore + 1),
        }),
      );
    });
  });

  describe("get-anchor-at", () => {
    it("returns none for an unknown index", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-at",
        [Cl.principal(wallet1), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeNone();
    });

    it("returns the stored record at the assigned index", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      register(wallet1, "a", "doc-a");
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-at",
        [Cl.principal(wallet1), Cl.uint(0)],
        wallet1,
      );
      expect(result).toBeSome(
        Cl.tuple({
          hash: hashOf("a"),
          label: Cl.stringAscii("doc-a"),
          "anchored-at": Cl.uint(stacksBefore + 1),
        }),
      );
    });
  });

  describe("get-anchor-count", () => {
    it("defaults to u0 for a principal with no anchors", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-count",
        [Cl.principal(wallet2)],
        wallet1,
      );
      expect(result).toBeUint(0);
    });
  });

  describe("get-recent-anchors", () => {
    it("returns ten none entries for a principal with no anchors", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-recent-anchors",
        [Cl.principal(wallet1)],
        wallet1,
      );
      expect(result).toStrictEqual(tenNone());
    });

    it("with 3 entries returns newest-first then 7 none slots", () => {
      const stacksBefore = simnet.stacksBlockHeight;
      register(wallet1, "a", "doc-0");
      register(wallet1, "b", "doc-1");
      register(wallet1, "c", "doc-2");
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-recent-anchors",
        [Cl.principal(wallet1)],
        wallet1,
      );
      expect(result).toStrictEqual(
        Cl.list([
          Cl.some(
            Cl.tuple({
              hash: hashOf("c"),
              label: Cl.stringAscii("doc-2"),
              "anchored-at": Cl.uint(stacksBefore + 3),
            }),
          ),
          Cl.some(
            Cl.tuple({
              hash: hashOf("b"),
              label: Cl.stringAscii("doc-1"),
              "anchored-at": Cl.uint(stacksBefore + 2),
            }),
          ),
          Cl.some(
            Cl.tuple({
              hash: hashOf("a"),
              label: Cl.stringAscii("doc-0"),
              "anchored-at": Cl.uint(stacksBefore + 1),
            }),
          ),
          Cl.none(),
          Cl.none(),
          Cl.none(),
          Cl.none(),
          Cl.none(),
          Cl.none(),
          Cl.none(),
        ]),
      );
    });

    it("with 12 entries returns only the last 10 newest-first", () => {
      const chars = "0123456789ab";
      const stacksBefore = simnet.stacksBlockHeight;
      for (let i = 0; i < 12; i++) {
        register(wallet1, chars[i], `doc-${i}`);
      }
      const { result } = simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-recent-anchors",
        [Cl.principal(wallet1)],
        wallet1,
      );
      const expectedItems = [];
      for (let offset = 0; offset < 10; offset++) {
        const originalIndex = 11 - offset;
        expectedItems.push(
          Cl.some(
            Cl.tuple({
              hash: hashOf(chars[originalIndex]),
              label: Cl.stringAscii(`doc-${originalIndex}`),
              "anchored-at": Cl.uint(stacksBefore + 1 + originalIndex),
            }),
          ),
        );
      }
      expect(result).toStrictEqual(Cl.list(expectedItems));
    });
  });
});
