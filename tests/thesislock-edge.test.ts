import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Edge cases for the core thesislock contract. The anchors map is keyed by the
// hash alone, so a hash is globally unique: the first anchor wins and any later
// anchor of the same hash fails with ERR-ALREADY-ANCHORED (u100), regardless of
// the sender. Labels are (string-ascii 64), so a 65-character label is rejected
// by the Clarity type system before the body runs.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashA = Cl.bufferFromHex("a".repeat(64));
const hashB = Cl.bufferFromHex("b".repeat(64));

const anchor = (
  hash: ReturnType<typeof Cl.bufferFromHex>,
  label: string,
  sender: string,
) =>
  simnet.callPublicFn(
    "thesislock",
    "anchor-document",
    [hash, Cl.stringAscii(label)],
    sender,
  );

describe("thesislock edge cases", () => {
  it("anchors with an empty label", () => {
    expect(anchor(hashA, "", wallet1).result).toBeOk(Cl.bool(true));
  });

  it("anchors with a 64-character label", () => {
    expect(anchor(hashA, "x".repeat(64), wallet1).result).toBeOk(Cl.bool(true));
  });

  it("rejects a 65-character label at the type boundary", () => {
    expect(() => anchor(hashA, "x".repeat(65), wallet1)).toThrow();
  });

  it("rejects re-anchoring the same hash from the same sender", () => {
    expect(anchor(hashA, "first", wallet1).result).toBeOk(Cl.bool(true));
    expect(anchor(hashA, "second", wallet1).result).toBeErr(Cl.uint(100));
  });

  it("rejects the same hash from a different sender (globally unique by hash)", () => {
    expect(anchor(hashA, "first", wallet1).result).toBeOk(Cl.bool(true));
    expect(anchor(hashA, "second", wallet2).result).toBeErr(Cl.uint(100));
  });

  it("allows two different hashes to be anchored", () => {
    expect(anchor(hashA, "doc-a", wallet1).result).toBeOk(Cl.bool(true));
    expect(anchor(hashB, "doc-b", wallet1).result).toBeOk(Cl.bool(true));
  });

  it("returns none from get-anchor for an unknown hash", () => {
    const { result } = simnet.callReadOnlyFn(
      "thesislock",
      "get-anchor",
      [hashA],
      wallet1,
    );
    expect(result).toBeNone();
  });

  it("records the anchoring principal and label", () => {
    anchor(hashA, "doc-a", wallet1);
    const { result } = simnet.callReadOnlyFn(
      "thesislock",
      "get-anchor",
      [hashA],
      wallet1,
    );
    expect(result).toBeSome(
      Cl.tuple({
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
        label: Cl.stringAscii("doc-a"),
      }),
    );
  });

  it("reports is-anchored false before and true after anchoring", () => {
    expect(
      simnet.callReadOnlyFn("thesislock", "is-anchored", [hashA], wallet1)
        .result,
    ).toBeBool(false);
    anchor(hashA, "doc-a", wallet1);
    expect(
      simnet.callReadOnlyFn("thesislock", "is-anchored", [hashA], wallet1)
        .result,
    ).toBeBool(true);
  });
});
