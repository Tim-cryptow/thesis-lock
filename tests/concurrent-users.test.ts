import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Multi-user scenarios. The registry anchor-count is per principal, so counts
// stay independent. The batch and group counters are global (shared across all
// callers), so these assert per-principal data isolation (each owner's records
// and the records they can read) rather than per-principal counter values.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const anchor = (n: number, sender: string) =>
  simnet.callPublicFn(
    "thesislock",
    "anchor-document",
    [hashN(n), Cl.stringAscii(`doc-${n}`)],
    sender,
  );
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
  ).result;
const isMember = (gid: number, who: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "is-member",
    [Cl.uint(gid), Cl.principal(who)],
    wallet1,
  ).result;

describe("concurrent multi-user scenarios", () => {
  it("lets three principals anchor different hashes", () => {
    expect(anchor(1, wallet1).result).toBeOk(Cl.bool(true));
    const s2start = simnet.stacksBlockHeight;
    expect(anchor(2, wallet2).result).toBeOk(Cl.bool(true));
    const s2 = simnet.stacksBlockHeight;
    const b2 = simnet.burnBlockHeight;
    expect(anchor(3, wallet3).result).toBeOk(Cl.bool(true));
    expect(s2).toBe(s2start + 1);
    expect(
      simnet.callReadOnlyFn("thesislock", "get-anchor", [hashN(2)], wallet1)
        .result,
    ).toBeSome(
      Cl.tuple({
        "anchored-by": Cl.principal(wallet2),
        "stacks-block": Cl.uint(s2),
        "burn-block": Cl.uint(b2),
        label: Cl.stringAscii("doc-2"),
      }),
    );
  });

  it("lets three principals each create their own group", () => {
    const g = (sender: string) =>
      simnet.callPublicFn(
        "thesislock-groups",
        "create-group",
        [Cl.stringAscii("g")],
        sender,
      ).result;
    expect(g(wallet1)).toBeOk(Cl.uint(1));
    expect(g(wallet2)).toBeOk(Cl.uint(2));
    expect(g(wallet3)).toBeOk(Cl.uint(3));
    // Each is the member of their own group only.
    expect(isMember(1, wallet1)).toBeBool(true);
    expect(isMember(1, wallet2)).toBeBool(false);
    expect(isMember(2, wallet2)).toBeBool(true);
    expect(isMember(3, wallet3)).toBeBool(true);
  });

  it("lets an admin add a member who then anchors to the group", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    expect(
      simnet.callPublicFn(
        "thesislock-groups",
        "add-member",
        [Cl.uint(1), Cl.principal(wallet2)],
        wallet1,
      ).result,
    ).toBeOk(Cl.bool(true));
    expect(
      simnet.callPublicFn(
        "thesislock-groups",
        "anchor-to-group",
        [Cl.uint(1), hashN(1), Cl.stringAscii("doc-1")],
        wallet2,
      ).result,
    ).toBeOk(Cl.uint(0));
    expect(isMember(1, wallet2)).toBeBool(true);
  });

  it("keeps each owner's batch records independent for the same hash", () => {
    expect(
      simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([Cl.tuple({ hash: hashN(1), label: Cl.stringAscii("a") })])],
        wallet1,
      ).result,
    ).toBeOk(Cl.uint(1));
    expect(
      simnet.callPublicFn(
        "thesislock-batch",
        "anchor-batch",
        [Cl.list([Cl.tuple({ hash: hashN(1), label: Cl.stringAscii("b") })])],
        wallet2,
      ).result,
    ).toBeOk(Cl.uint(2));
    expect(
      simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashN(1), Cl.principal(wallet1)],
        wallet1,
      ).result,
    ).not.toBeNone();
    expect(
      simnet.callReadOnlyFn(
        "thesislock-batch",
        "get-batch-anchor",
        [hashN(1), Cl.principal(wallet2)],
        wallet1,
      ).result,
    ).not.toBeNone();
  });

  it("keeps registry counts independent per principal", () => {
    register(1, wallet1);
    register(2, wallet1);
    register(3, wallet2);
    expect(count(wallet1)).toBeUint(2);
    expect(count(wallet2)).toBeUint(1);
    expect(count(wallet3)).toBeUint(0);
  });

  it("lets two principals mint proofs for different hashes with sequential ids", () => {
    expect(
      simnet.callPublicFn(
        "thesislock-proof",
        "mint-proof",
        [hashN(1), Cl.stringAscii("a")],
        wallet1,
      ).result,
    ).toBeOk(Cl.uint(1));
    expect(
      simnet.callPublicFn(
        "thesislock-proof",
        "mint-proof",
        [hashN(2), Cl.stringAscii("b")],
        wallet2,
      ).result,
    ).toBeOk(Cl.uint(2));
    expect(
      simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(1)],
        wallet1,
      ).result,
    ).toBeOk(Cl.some(Cl.principal(wallet1)));
    expect(
      simnet.callReadOnlyFn(
        "thesislock-proof",
        "get-owner",
        [Cl.uint(2)],
        wallet1,
      ).result,
    ).toBeOk(Cl.some(Cl.principal(wallet2)));
  });

  it("blocks a second principal from anchoring a hash already in the core contract", () => {
    expect(anchor(1, wallet1).result).toBeOk(Cl.bool(true));
    expect(anchor(1, wallet2).result).toBeErr(Cl.uint(100));
  });

  it("lets a non-member's anchor to another principal's group fail", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    expect(
      simnet.callPublicFn(
        "thesislock-groups",
        "anchor-to-group",
        [Cl.uint(1), hashN(1), Cl.stringAscii("doc-1")],
        wallet3,
      ).result,
    ).toBeErr(Cl.uint(403));
  });
});
