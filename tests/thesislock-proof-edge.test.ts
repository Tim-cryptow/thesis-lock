import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Edge cases for the soulbound proof NFT. mint-proof issues a sequential,
// non-transferable token per unique hash. Duplicate hashes are rejected with
// ERR-DUPLICATE-HASH (u409); transfer always returns ERR-SOULBOUND (u401). The
// metadata, owner, and last-token-id read-only functions are response-wrapped.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const mint = (n: number, sender: string, label = `doc-${n}`) =>
  simnet.callPublicFn(
    "thesislock-proof",
    "mint-proof",
    [hashN(n), Cl.stringAscii(label)],
    sender,
  );
const ro = (fn: string, args: Parameters<typeof simnet.callReadOnlyFn>[2]) =>
  simnet.callReadOnlyFn("thesislock-proof", fn, args, wallet1).result;

describe("thesislock-proof edge cases", () => {
  it("starts with last-token-id 0 and increments per mint", () => {
    expect(ro("get-last-token-id", [])).toBeOk(Cl.uint(0));
    mint(1, wallet1);
    expect(ro("get-last-token-id", [])).toBeOk(Cl.uint(1));
  });

  it("assigns sequential token ids", () => {
    expect(mint(1, wallet1).result).toBeOk(Cl.uint(1));
    expect(mint(2, wallet1).result).toBeOk(Cl.uint(2));
    expect(mint(3, wallet1).result).toBeOk(Cl.uint(3));
    expect(ro("get-last-token-id", [])).toBeOk(Cl.uint(3));
  });

  it("rejects transfers with err u401 (soulbound)", () => {
    mint(1, wallet1);
    const { result } = simnet.callPublicFn(
      "thesislock-proof",
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it("rejects a duplicate hash with err u409", () => {
    expect(mint(1, wallet1).result).toBeOk(Cl.uint(1));
    expect(mint(1, wallet2).result).toBeErr(Cl.uint(409));
  });

  it("leaves the counter unchanged after a rejected duplicate", () => {
    mint(1, wallet1);
    mint(1, wallet2);
    expect(ro("get-last-token-id", [])).toBeOk(Cl.uint(1));
  });

  it("returns none from get-proof for a non-existent token", () => {
    expect(ro("get-proof", [Cl.uint(99)])).toBeNone();
  });

  it("returns none from get-proof-by-hash for a non-anchored hash", () => {
    expect(ro("get-proof-by-hash", [hashN(99)])).toBeNone();
  });

  it("returns the token id by hash after minting", () => {
    mint(1, wallet1);
    expect(ro("get-token-id-by-hash", [hashN(1)])).toBeSome(Cl.uint(1));
  });

  it("returns the metadata uri template", () => {
    expect(ro("get-token-uri", [Cl.uint(1)])).toBeOk(
      Cl.some(Cl.stringAscii("https://thesis-lock.vercel.app/api/nft/{id}")),
    );
  });

  it("assigns ownership to the minter", () => {
    mint(1, wallet1);
    expect(ro("get-owner", [Cl.uint(1)])).toBeOk(Cl.some(Cl.principal(wallet1)));
  });

  it("returns the stored proof data after minting", () => {
    mint(1, wallet1, "thesis");
    expect(ro("get-proof", [Cl.uint(1)])).toBeSome(
      Cl.tuple({
        hash: hashN(1),
        label: Cl.stringAscii("thesis"),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
      }),
    );
  });

  it("returns ok none from get-owner for a non-existent token", () => {
    expect(ro("get-owner", [Cl.uint(99)])).toBeOk(Cl.none());
  });
});
