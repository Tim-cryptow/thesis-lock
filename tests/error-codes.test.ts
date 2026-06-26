import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Every error condition across the ThesisLock contracts and the code it returns:
//   thesislock        u100  ERR-ALREADY-ANCHORED     re-anchoring a known hash
//   thesislock-proof  u409  ERR-DUPLICATE-HASH       minting an already-minted hash
//   thesislock-proof  u401  ERR-SOULBOUND            any transfer attempt
//   thesislock-groups u403  ERR-NOT-ADMIN            non-admin add/remove member
//   thesislock-groups u403  ERR-NOT-MEMBER           non-member anchoring to a group
//   thesislock-groups u400  ERR-CANNOT-REMOVE-SELF   admin removing itself
// The batch and registry contracts define no error constants: their writes
// either succeed or are silently skipped (map-insert), so they have no error
// paths to assert here.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));

describe("error codes", () => {
  it("thesislock: re-anchoring a hash returns u100", () => {
    simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("a")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("b")],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(100));
  });

  it("thesislock-proof: minting a duplicate hash returns u409", () => {
    simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("a")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("b")],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(409));
  });

  it("thesislock-proof: transferring a token returns u401", () => {
    simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("a")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-proof",
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(401));
  });

  it("thesislock-groups: a non-admin adding a member returns u403", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-groups",
      "add-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(403));
  });

  it("thesislock-groups: a non-admin removing a member returns u403", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-groups",
      "remove-member",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(403));
  });

  it("thesislock-groups: the admin removing itself returns u400", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-groups",
      "remove-member",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(400));
  });

  it("thesislock-groups: a non-member anchoring returns u403", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { result } = simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(1), hashN(1), Cl.stringAscii("a")],
      wallet2,
    );
    expect(result).toBeErr(Cl.uint(403));
  });

  it("thesislock-groups: anchoring to a non-existent group returns u403", () => {
    const { result } = simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(99), hashN(1), Cl.stringAscii("a")],
      wallet1,
    );
    expect(result).toBeErr(Cl.uint(403));
  });
});
