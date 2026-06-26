import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Workflows that span multiple contracts. The contracts do not call each other
// on chain; these exercise the real app flows (anchor then register, anchor then
// mint a proof, group anchor then read back) and confirm each contract stores
// and returns the same record independently.

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

describe("cross-contract workflows", () => {
  it("anchors in thesislock and registers in the registry, both readable", () => {
    simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    const aStacks = simnet.stacksBlockHeight;
    const aBurn = simnet.burnBlockHeight;
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    const rStacks = simnet.stacksBlockHeight;
    expect(ro("thesislock", "get-anchor", [hashN(1)])).toBeSome(
      Cl.tuple({
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(aStacks),
        "burn-block": Cl.uint(aBurn),
        label: Cl.stringAscii("doc-1"),
      }),
    );
    expect(
      ro("thesislock-registry", "get-anchor-at", [
        Cl.principal(wallet1),
        Cl.uint(0),
      ]),
    ).toBeSome(
      Cl.tuple({
        hash: hashN(1),
        label: Cl.stringAscii("doc-1"),
        "anchored-at": Cl.uint(rStacks),
      }),
    );
  });

  it("batch anchors then registers each hash individually", () => {
    simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [
        Cl.list([
          Cl.tuple({ hash: hashN(1), label: Cl.stringAscii("a") }),
          Cl.tuple({ hash: hashN(2), label: Cl.stringAscii("b") }),
        ]),
      ],
      wallet1,
    );
    expect(
      ro("thesislock-batch", "get-batch-anchor", [
        hashN(1),
        Cl.principal(wallet1),
      ]),
    ).not.toBeNone();
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(1), Cl.stringAscii("a")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(2), Cl.stringAscii("b")],
      wallet1,
    );
    expect(
      ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
    ).toBeUint(2);
  });

  it("anchors and mints a proof for the same hash, both stored", () => {
    simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    expect(ro("thesislock", "is-anchored", [hashN(1)])).toBeBool(true);
    expect(ro("thesislock-proof", "get-token-id-by-hash", [hashN(1)])).toBeSome(
      Cl.uint(1),
    );
  });

  it("group anchors then reads the same record via get-group-anchor-at", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(1), hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    const s = simnet.stacksBlockHeight;
    expect(
      ro("thesislock-groups", "get-group-anchor-at", [Cl.uint(1), Cl.uint(0)]),
    ).toBeSome(
      Cl.tuple({
        hash: hashN(1),
        label: Cl.stringAscii("doc-1"),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(s),
      }),
    );
  });

  it("mints a proof and resolves it via get-proof-by-hash", () => {
    simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("thesis")],
      wallet1,
    );
    const s = simnet.stacksBlockHeight;
    const b = simnet.burnBlockHeight;
    expect(ro("thesislock-proof", "get-proof-by-hash", [hashN(1)])).toBeSome(
      Cl.tuple({
        hash: hashN(1),
        label: Cl.stringAscii("thesis"),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(s),
        "burn-block": Cl.uint(b),
      }),
    );
    expect(ro("thesislock-proof", "get-token-id-by-hash", [hashN(1)])).toBeSome(
      Cl.uint(1),
    );
  });

  it("lets the same hash live in all four anchoring contracts independently", () => {
    simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("x")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [Cl.list([Cl.tuple({ hash: hashN(1), label: Cl.stringAscii("x") })])],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(1), Cl.stringAscii("x")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("x")],
      wallet1,
    );
    expect(ro("thesislock", "is-anchored", [hashN(1)])).toBeBool(true);
    expect(
      ro("thesislock-batch", "get-batch-anchor", [
        hashN(1),
        Cl.principal(wallet1),
      ]),
    ).not.toBeNone();
    expect(
      ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
    ).toBeUint(1);
    expect(ro("thesislock-proof", "get-token-id-by-hash", [hashN(1)])).toBeSome(
      Cl.uint(1),
    );
  });

  it("anchors to a group and registers the same hash in the registry", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("team")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(1), hashN(3), Cl.stringAscii("draft")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(3), Cl.stringAscii("draft")],
      wallet1,
    );
    expect(
      ro("thesislock-groups", "get-group-anchor-count", [Cl.uint(1)]),
    ).toBeUint(1);
    expect(
      ro("thesislock-registry", "get-anchor-count", [Cl.principal(wallet1)]),
    ).toBeUint(1);
  });

  it("matches the anchored record between thesislock and the registry", () => {
    simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(7), Cl.stringAscii("paper")],
      wallet2,
    );
    const aStacks = simnet.stacksBlockHeight;
    const aBurn = simnet.burnBlockHeight;
    simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(7), Cl.stringAscii("paper")],
      wallet2,
    );
    const rStacks = simnet.stacksBlockHeight;
    expect(
      simnet.callReadOnlyFn(
        "thesislock-registry",
        "get-anchor-at",
        [Cl.principal(wallet2), Cl.uint(0)],
        wallet2,
      ).result,
    ).toBeSome(
      Cl.tuple({
        hash: hashN(7),
        label: Cl.stringAscii("paper"),
        "anchored-at": Cl.uint(rStacks),
      }),
    );
    expect(ro("thesislock", "get-anchor", [hashN(7)])).toBeSome(
      Cl.tuple({
        "anchored-by": Cl.principal(wallet2),
        "stacks-block": Cl.uint(aStacks),
        "burn-block": Cl.uint(aBurn),
        label: Cl.stringAscii("paper"),
      }),
    );
  });
});
