import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Extreme and boundary inputs: the all-zero and all-ff hashes, labels made of
// punctuation, digits, only spaces, or a single pipe (which is a structural
// delimiter off chain but an ordinary byte on chain), a digits-only group name,
// and a maximum 128-bit uint index.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

const ZERO_HASH = Cl.bufferFromHex("0".repeat(64));
const FF_HASH = Cl.bufferFromHex("f".repeat(64));
const MAX_UINT = 340282366920938463463374607431768211455n;

const anchor = (hash: ReturnType<typeof Cl.bufferFromHex>, label: string) =>
  simnet.callPublicFn(
    "thesislock",
    "anchor-document",
    [hash, Cl.stringAscii(label)],
    wallet1,
  );
const storedAnchor = (label: string) =>
  Cl.tuple({
    "anchored-by": Cl.principal(wallet1),
    "stacks-block": Cl.uint(simnet.stacksBlockHeight),
    "burn-block": Cl.uint(simnet.burnBlockHeight),
    label: Cl.stringAscii(label),
  });

describe("boundary value inputs", () => {
  it("anchors the all-zero hash", () => {
    expect(anchor(ZERO_HASH, "zero").result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("thesislock", "get-anchor", [ZERO_HASH], wallet1)
        .result,
    ).toBeSome(storedAnchor("zero"));
  });

  it("anchors the all-ff hash, distinct from the all-zero hash", () => {
    expect(anchor(ZERO_HASH, "zero").result).toBeOk(Cl.bool(true));
    expect(anchor(FF_HASH, "ones").result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("thesislock", "is-anchored", [FF_HASH], wallet1)
        .result,
    ).toBeBool(true);
  });

  it("round-trips a label with spaces, punctuation, and digits", () => {
    const label = "Draft 2 - v1.0 (final)!";
    anchor(ZERO_HASH, label);
    expect(
      simnet.callReadOnlyFn("thesislock", "get-anchor", [ZERO_HASH], wallet1)
        .result,
    ).toBeSome(storedAnchor(label));
  });

  it("accepts a label of only spaces", () => {
    anchor(ZERO_HASH, "   ");
    expect(
      simnet.callReadOnlyFn("thesislock", "get-anchor", [ZERO_HASH], wallet1)
        .result,
    ).toBeSome(storedAnchor("   "));
  });

  it("accepts a label that is a single pipe character", () => {
    anchor(ZERO_HASH, "|");
    expect(
      simnet.callReadOnlyFn("thesislock", "get-anchor", [ZERO_HASH], wallet1)
        .result,
    ).toBeSome(storedAnchor("|"));
  });

  it("creates a group with a digits-only name", () => {
    const result = simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("1234567890")],
      wallet1,
    ).result;
    expect(result).toBeOk(Cl.uint(1));
    expect(
      simnet.callReadOnlyFn("thesislock-groups", "get-group", [Cl.uint(1)], wallet1)
        .result,
    ).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("1234567890"),
        admin: Cl.principal(wallet1),
        "created-at": Cl.uint(simnet.stacksBlockHeight),
      }),
    );
  });

  it("returns none for a registry index at the maximum uint", () => {
    expect(
      simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-at",
        [Cl.principal(wallet1), Cl.uint(MAX_UINT)],
        wallet1,
      ).result,
    ).toBeNone();
  });

  it("round-trips a special-character label through the batch contract", () => {
    const label = "v2.1: chapter-3 (rev. A)";
    simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [Cl.list([Cl.tuple({ hash: FF_HASH, label: Cl.stringAscii(label) })])],
      wallet1,
    );
    expect(
      simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [FF_HASH, Cl.principal(wallet1)],
        wallet1,
      ).result,
    ).toBeSome(
      Cl.tuple({
        label: Cl.stringAscii(label),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
        "batch-id": Cl.uint(1),
      }),
    );
  });
});
