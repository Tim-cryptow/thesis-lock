import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Edge cases for collaborative groups. create-group makes the caller the admin
// and first member. add-member/remove-member are admin-gated (u403), the admin
// cannot remove itself (u400), and only members may anchor (u403). Empty and
// max-length names are accepted, and re-adding or removing a non-member are
// idempotent no-op successes.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!; // admin
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const createGroup = (name: string, sender: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "create-group",
    [Cl.stringAscii(name)],
    sender,
  );
const addMember = (gid: number, member: string, sender: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "add-member",
    [Cl.uint(gid), Cl.principal(member)],
    sender,
  );
const removeMember = (gid: number, member: string, sender: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "remove-member",
    [Cl.uint(gid), Cl.principal(member)],
    sender,
  );
const anchorToGroup = (gid: number, n: number, sender: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "anchor-to-group",
    [Cl.uint(gid), hashN(n), Cl.stringAscii(`doc-${n}`)],
    sender,
  );
const isMember = (gid: number, who: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "is-member",
    [Cl.uint(gid), Cl.principal(who)],
    wallet1,
  ).result;
const groupCount = (gid: number) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-group-anchor-count",
    [Cl.uint(gid)],
    wallet1,
  ).result;
const recentGroup = (gid: number) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-recent-group-anchors",
    [Cl.uint(gid)],
    wallet1,
  ).result;

describe("thesislock-groups edge cases", () => {
  it("creates a group with an empty name", () => {
    expect(createGroup("", wallet1).result).toBeOk(Cl.uint(1));
  });

  it("creates a group with a 64-character name", () => {
    expect(createGroup("x".repeat(64), wallet1).result).toBeOk(Cl.uint(1));
  });

  it("adds the creator as a member automatically", () => {
    createGroup("g", wallet1);
    expect(isMember(1, wallet1)).toBeBool(true);
  });

  it("lets the admin add a member, and adding twice is idempotent", () => {
    createGroup("g", wallet1);
    expect(addMember(1, wallet2, wallet1).result).toBeOk(Cl.bool(true));
    expect(addMember(1, wallet2, wallet1).result).toBeOk(Cl.bool(true));
    expect(isMember(1, wallet2)).toBeBool(true);
  });

  it("rejects a non-admin adding a member with err u403", () => {
    createGroup("g", wallet1);
    expect(addMember(1, wallet3, wallet2).result).toBeErr(Cl.uint(403));
  });

  it("rejects a non-admin removing a member with err u403", () => {
    createGroup("g", wallet1);
    addMember(1, wallet2, wallet1);
    expect(removeMember(1, wallet2, wallet2).result).toBeErr(Cl.uint(403));
  });

  it("rejects the admin removing itself with err u400", () => {
    createGroup("g", wallet1);
    expect(removeMember(1, wallet1, wallet1).result).toBeErr(Cl.uint(400));
  });

  it("removes a member, and removing a non-member is a no-op success", () => {
    createGroup("g", wallet1);
    addMember(1, wallet2, wallet1);
    expect(removeMember(1, wallet2, wallet1).result).toBeOk(Cl.bool(true));
    expect(isMember(1, wallet2)).toBeBool(false);
    expect(removeMember(1, wallet3, wallet1).result).toBeOk(Cl.bool(true));
  });

  it("lets a member anchor and rejects a non-member with err u403", () => {
    createGroup("g", wallet1);
    addMember(1, wallet2, wallet1);
    expect(anchorToGroup(1, 1, wallet2).result).toBeOk(Cl.uint(0));
    expect(anchorToGroup(1, 2, wallet3).result).toBeErr(Cl.uint(403));
  });

  it("rejects anchoring to a non-existent group with err u403", () => {
    expect(anchorToGroup(99, 1, wallet1).result).toBeErr(Cl.uint(403));
  });

  it("returns none from get-group for a non-existent group", () => {
    expect(
      simnet.callReadOnlyFn(
        "thesislock-groups",
        "get-group",
        [Cl.uint(99)],
        wallet1,
      ).result,
    ).toBeNone();
  });

  it("returns the recent group anchors window at 0, then 15 anchors", () => {
    createGroup("g", wallet1);
    expect(recentGroup(1)).toStrictEqual(
      Cl.list(Array.from({ length: 10 }, () => Cl.none())),
    );
    const h0 = simnet.stacksBlockHeight;
    for (let i = 1; i <= 15; i++) anchorToGroup(1, i, wallet1);
    expect(groupCount(1)).toBeUint(15);
    const expected = Cl.list(
      Array.from({ length: 10 }, (_, p) => {
        const idx = 14 - p;
        return Cl.some(
          Cl.tuple({
            hash: hashN(idx + 1),
            label: Cl.stringAscii(`doc-${idx + 1}`),
            "anchored-by": Cl.principal(wallet1),
            "stacks-block": Cl.uint(h0 + idx + 1),
          }),
        );
      }),
    );
    expect(recentGroup(1)).toStrictEqual(expected);
  });
});
