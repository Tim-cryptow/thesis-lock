import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

const hexOf = (c: string) => c.repeat(64);
const hashOf = (c: string) => Cl.bufferFromHex(hexOf(c));

const createGroup = (sender: string, name: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "create-group",
    [Cl.stringAscii(name)],
    sender,
  );

const addMember = (sender: string, groupId: number, member: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "add-member",
    [Cl.uint(groupId), Cl.principal(member)],
    sender,
  );

const removeMember = (sender: string, groupId: number, member: string) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "remove-member",
    [Cl.uint(groupId), Cl.principal(member)],
    sender,
  );

const anchorToGroup = (
  sender: string,
  groupId: number,
  hashChar: string,
  label: string,
) =>
  simnet.callPublicFn(
    "thesislock-groups",
    "anchor-to-group",
    [Cl.uint(groupId), hashOf(hashChar), Cl.stringAscii(label)],
    sender,
  );

const isMember = (groupId: number, who: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "is-member",
    [Cl.uint(groupId), Cl.principal(who)],
    who,
  );

const getGroup = (groupId: number, sender: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-group",
    [Cl.uint(groupId)],
    sender,
  );

const anchorCount = (groupId: number, sender: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-group-anchor-count",
    [Cl.uint(groupId)],
    sender,
  );

const anchorAt = (groupId: number, index: number, sender: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-group-anchor-at",
    [Cl.uint(groupId), Cl.uint(index)],
    sender,
  );

const recentAnchors = (groupId: number, sender: string) =>
  simnet.callReadOnlyFn(
    "thesislock-groups",
    "get-recent-group-anchors",
    [Cl.uint(groupId)],
    sender,
  );

const tenNone = () => Cl.list(Array.from({ length: 10 }, () => Cl.none()));

describe("thesislock-groups", () => {
  describe("create-group", () => {
    it("returns (ok u1) for the first group and increments per call", () => {
      const r1 = createGroup(wallet1, "committee");
      const r2 = createGroup(wallet1, "lab");
      const r3 = createGroup(wallet2, "legal");
      expect(r1.result).toBeOk(Cl.uint(1));
      expect(r2.result).toBeOk(Cl.uint(2));
      expect(r3.result).toBeOk(Cl.uint(3));
    });

    it("stores the group with tx-sender as admin", () => {
      const created = simnet.stacksBlockHeight + 1;
      createGroup(wallet1, "committee");
      const { result } = getGroup(1, wallet1);
      expect(result).toBeSome(
        Cl.tuple({
          name: Cl.stringAscii("committee"),
          admin: Cl.principal(wallet1),
          "created-at": Cl.uint(created),
        }),
      );
    });

    it("auto-adds the admin as a member", () => {
      createGroup(wallet1, "committee");
      expect(isMember(1, wallet1).result).toBeBool(true);
    });
  });

  describe("add-member", () => {
    it("lets the admin add a member, making is-member return true", () => {
      createGroup(wallet1, "committee");
      expect(isMember(1, wallet2).result).toBeBool(false);
      const { result } = addMember(wallet1, 1, wallet2);
      expect(result).toBeOk(Cl.bool(true));
      expect(isMember(1, wallet2).result).toBeBool(true);
    });

    it("rejects a non-admin with err u403", () => {
      createGroup(wallet1, "committee");
      const { result } = addMember(wallet2, 1, wallet3);
      expect(result).toBeErr(Cl.uint(403));
      expect(isMember(1, wallet3).result).toBeBool(false);
    });
  });

  describe("remove-member", () => {
    it("lets the admin remove a member, making is-member return false", () => {
      createGroup(wallet1, "committee");
      addMember(wallet1, 1, wallet2);
      expect(isMember(1, wallet2).result).toBeBool(true);
      const { result } = removeMember(wallet1, 1, wallet2);
      expect(result).toBeOk(Cl.bool(true));
      expect(isMember(1, wallet2).result).toBeBool(false);
    });

    it("does not let the admin remove themselves (err u400)", () => {
      createGroup(wallet1, "committee");
      const { result } = removeMember(wallet1, 1, wallet1);
      expect(result).toBeErr(Cl.uint(400));
      expect(isMember(1, wallet1).result).toBeBool(true);
    });

    it("rejects a non-admin with err u403", () => {
      createGroup(wallet1, "committee");
      addMember(wallet1, 1, wallet2);
      const { result } = removeMember(wallet2, 1, wallet2);
      expect(result).toBeErr(Cl.uint(403));
    });
  });

  describe("anchor-to-group", () => {
    it("lets a member anchor and returns the assigned index", () => {
      createGroup(wallet1, "committee");
      addMember(wallet1, 1, wallet2);
      const r0 = anchorToGroup(wallet1, 1, "a", "draft-0");
      const r1 = anchorToGroup(wallet2, 1, "b", "draft-1");
      expect(r0.result).toBeOk(Cl.uint(0));
      expect(r1.result).toBeOk(Cl.uint(1));
    });

    it("stores the anchor data correctly", () => {
      createGroup(wallet1, "committee");
      const block = simnet.stacksBlockHeight + 1;
      anchorToGroup(wallet1, 1, "a", "draft-0");
      const { result } = anchorAt(1, 0, wallet1);
      expect(result).toBeSome(
        Cl.tuple({
          hash: hashOf("a"),
          label: Cl.stringAscii("draft-0"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(block),
        }),
      );
    });

    it("rejects a non-member with err u403", () => {
      createGroup(wallet1, "committee");
      const { result } = anchorToGroup(wallet2, 1, "a", "draft-0");
      expect(result).toBeErr(Cl.uint(403));
      expect(anchorCount(1, wallet1).result).toBeUint(0);
    });

    it("increments the anchor count per anchor", () => {
      createGroup(wallet1, "committee");
      expect(anchorCount(1, wallet1).result).toBeUint(0);
      anchorToGroup(wallet1, 1, "a", "draft-0");
      expect(anchorCount(1, wallet1).result).toBeUint(1);
      anchorToGroup(wallet1, 1, "b", "draft-1");
      expect(anchorCount(1, wallet1).result).toBeUint(2);
    });

    it("emits a group-anchor-added print event with the index", () => {
      createGroup(wallet1, "committee");
      const block = simnet.stacksBlockHeight + 1;
      const { events } = anchorToGroup(wallet1, 1, "a", "draft-0");
      const printEvent = events.find((e) => e.event === "print_event");
      expect(printEvent).toBeDefined();
      expect(printEvent!.data.value).toStrictEqual(
        Cl.tuple({
          event: Cl.stringAscii("group-anchor-added"),
          "group-id": Cl.uint(1),
          index: Cl.uint(0),
          hash: hashOf("a"),
          label: Cl.stringAscii("draft-0"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(block),
        }),
      );
    });
  });

  describe("get-group", () => {
    it("returns none for an unknown group id", () => {
      expect(getGroup(99, wallet1).result).toBeNone();
    });
  });

  describe("get-group-anchor-at", () => {
    it("returns none for an unknown index", () => {
      createGroup(wallet1, "committee");
      expect(anchorAt(1, 5, wallet1).result).toBeNone();
    });

    it("returns the stored record at the assigned index", () => {
      createGroup(wallet1, "committee");
      const block = simnet.stacksBlockHeight + 1;
      anchorToGroup(wallet1, 1, "c", "draft-c");
      const { result } = anchorAt(1, 0, wallet1);
      expect(result).toBeSome(
        Cl.tuple({
          hash: hashOf("c"),
          label: Cl.stringAscii("draft-c"),
          "anchored-by": Cl.principal(wallet1),
          "stacks-block": Cl.uint(block),
        }),
      );
    });
  });

  describe("get-recent-group-anchors", () => {
    it("returns ten none entries for a group with no anchors", () => {
      createGroup(wallet1, "committee");
      expect(recentAnchors(1, wallet1).result).toStrictEqual(tenNone());
    });

    it("with 3 entries returns newest-first then 7 none slots", () => {
      createGroup(wallet1, "committee");
      const base = simnet.stacksBlockHeight;
      anchorToGroup(wallet1, 1, "a", "draft-0");
      anchorToGroup(wallet1, 1, "b", "draft-1");
      anchorToGroup(wallet1, 1, "c", "draft-2");
      const { result } = recentAnchors(1, wallet1);
      expect(result).toStrictEqual(
        Cl.list([
          Cl.some(
            Cl.tuple({
              hash: hashOf("c"),
              label: Cl.stringAscii("draft-2"),
              "anchored-by": Cl.principal(wallet1),
              "stacks-block": Cl.uint(base + 3),
            }),
          ),
          Cl.some(
            Cl.tuple({
              hash: hashOf("b"),
              label: Cl.stringAscii("draft-1"),
              "anchored-by": Cl.principal(wallet1),
              "stacks-block": Cl.uint(base + 2),
            }),
          ),
          Cl.some(
            Cl.tuple({
              hash: hashOf("a"),
              label: Cl.stringAscii("draft-0"),
              "anchored-by": Cl.principal(wallet1),
              "stacks-block": Cl.uint(base + 1),
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
      createGroup(wallet1, "committee");
      const chars = "0123456789ab";
      const base = simnet.stacksBlockHeight;
      for (let i = 0; i < 12; i++) {
        anchorToGroup(wallet1, 1, chars[i], `draft-${i}`);
      }
      const { result } = recentAnchors(1, wallet1);
      const expectedItems = [];
      for (let offset = 0; offset < 10; offset++) {
        const originalIndex = 11 - offset;
        expectedItems.push(
          Cl.some(
            Cl.tuple({
              hash: hashOf(chars[originalIndex]),
              label: Cl.stringAscii(`draft-${originalIndex}`),
              "anchored-by": Cl.principal(wallet1),
              "stacks-block": Cl.uint(base + 1 + originalIndex),
            }),
          ),
        );
      }
      expect(result).toStrictEqual(Cl.list(expectedItems));
    });
  });
});
