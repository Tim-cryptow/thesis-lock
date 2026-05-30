import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hexOf = (c: string) => c.repeat(64);
const hashOf = (c: string) => Cl.bufferFromHex(hexOf(c));

const mint = (sender: string, hashChar: string, label: string) =>
  simnet.callPublicFn(
    "thesislock-proof",
    "mint-proof",
    [hashOf(hashChar), Cl.stringAscii(label)],
    sender,
  );

const readProof = (tokenId: number, sender: string) =>
  simnet.callReadOnlyFn(
    "thesislock-proof",
    "get-proof",
    [Cl.uint(tokenId)],
    sender,
  );

const lastTokenId = (sender: string) =>
  simnet.callReadOnlyFn("thesislock-proof", "get-last-token-id", [], sender);

describe("thesislock-proof", () => {
  describe("mint-proof", () => {
    it("returns (ok u1) for the first mint and increments per mint", () => {
      const r1 = mint(wallet1, "a", "doc-a");
      const r2 = mint(wallet1, "b", "doc-b");
      const r3 = mint(wallet1, "c", "doc-c");
      expect(r1.result).toBeOk(Cl.uint(1));
      expect(r2.result).toBeOk(Cl.uint(2));
      expect(r3.result).toBeOk(Cl.uint(3));
    });

    it("stores proof-data with the minter, label, hash, and block heights", () => {
      mint(wallet1, "a", "doc-a");
      const stacksBlock = simnet.stacksBlockHeight;
      const burnBlock = simnet.burnBlockHeight;
      const { result } = readProof(1, wallet1);
      expect(result).toBeSome(
        Cl.tuple({
          hash: hashOf("a"),
          label: Cl.stringAscii("doc-a"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(stacksBlock),
          "burn-block": Cl.uint(burnBlock),
        }),
      );
    });

    it("assigns ownership of the minted token to tx-sender", () => {
      mint(wallet1, "a", "doc-a");
      const { result } = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(1)],
        wallet1,
      );
      expect(result).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("emits a proof-minted print event with the token id and hash", () => {
      const { events } = mint(wallet1, "a", "doc-a");
      const stacksBlock = simnet.stacksBlockHeight;
      const burnBlock = simnet.burnBlockHeight;
      const printEvent = events.find((e) => e.event === "print_event");
      expect(printEvent).toBeDefined();
      expect(printEvent!.data.value).toStrictEqual(
        Cl.tuple({
          event: Cl.stringAscii("proof-minted"),
          "token-id": Cl.uint(1),
          hash: hashOf("a"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(stacksBlock),
          "burn-block": Cl.uint(burnBlock),
        }),
      );
    });

    it("rejects a duplicate hash with err u409, leaving the counter unchanged", () => {
      const first = mint(wallet1, "a", "doc-a");
      expect(first.result).toBeOk(Cl.uint(1));
      const dup = mint(wallet2, "a", "someone-else");
      expect(dup.result).toBeErr(Cl.uint(409));
      expect(lastTokenId(wallet1).result).toBeOk(Cl.uint(1));
    });

    it("mints independent tokens for different principals", () => {
      const r1 = mint(wallet1, "a", "w1");
      const r2 = mint(wallet2, "b", "w2");
      expect(r1.result).toBeOk(Cl.uint(1));
      expect(r2.result).toBeOk(Cl.uint(2));
      const o1 = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(1)],
        wallet1,
      );
      const o2 = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(2)],
        wallet1,
      );
      expect(o1.result).toBeOk(Cl.some(Cl.principal(wallet1)));
      expect(o2.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });
  });

  describe("get-last-token-id", () => {
    it("starts at u0 before any mint", () => {
      expect(lastTokenId(wallet1).result).toBeOk(Cl.uint(0));
    });

    it("tracks the highest assigned token id", () => {
      mint(wallet1, "a", "doc-a");
      mint(wallet1, "b", "doc-b");
      expect(lastTokenId(wallet1).result).toBeOk(Cl.uint(2));
    });
  });

  describe("get-proof", () => {
    it("returns none for an unknown token id", () => {
      expect(readProof(99, wallet1).result).toBeNone();
    });
  });

  describe("get-proof-by-hash", () => {
    it("resolves the proof for a minted hash via the secondary map", () => {
      mint(wallet1, "a", "doc-a");
      const stacksBlock = simnet.stacksBlockHeight;
      const burnBlock = simnet.burnBlockHeight;
      const { result } = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-proof-by-hash",
        [hashOf("a")],
        wallet1,
      );
      expect(result).toBeSome(
        Cl.tuple({
          hash: hashOf("a"),
          label: Cl.stringAscii("doc-a"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(stacksBlock),
          "burn-block": Cl.uint(burnBlock),
        }),
      );
    });

    it("returns none for a hash that was never minted", () => {
      const { result } = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-proof-by-hash",
        [hashOf("f")],
        wallet1,
      );
      expect(result).toBeNone();
    });
  });

  describe("get-token-id-by-hash", () => {
    it("returns the token id backing a minted hash", () => {
      mint(wallet1, "a", "doc-a");
      mint(wallet1, "b", "doc-b");
      const { result } = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-token-id-by-hash",
        [hashOf("b")],
        wallet1,
      );
      expect(result).toBeSome(Cl.uint(2));
    });
  });

  describe("transfer", () => {
    it("always fails with err u401 (soulbound)", () => {
      mint(wallet1, "a", "doc-a");
      const { result } = simnet.callPublicFn(
        "thesislock-proof",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1,
      );
      expect(result).toBeErr(Cl.uint(401));
      const owner = simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(1)],
        wallet1,
      );
      expect(owner.result).toBeOk(Cl.some(Cl.principal(wallet1)));
    });
  });
});
