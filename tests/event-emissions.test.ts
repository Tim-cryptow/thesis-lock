import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Verifies the print event each public function emits: the event name, every
// field, and that the values match what the contract stores. The event is the
// off-chain indexer's source of truth, so its shape must stay stable.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));
const entry = (n: number) =>
  Cl.tuple({ hash: hashN(n), label: Cl.stringAscii(`doc-${n}`) });
const printOf = (events: ReturnType<typeof simnet.callPublicFn>["events"]) =>
  events.find((e) => e.event === "print_event")!.data.value;

describe("print event emissions", () => {
  it("anchor-document emits anchor-created", () => {
    const { events } = simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("anchor-created"),
        hash: hashN(1),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
        label: Cl.stringAscii("doc-1"),
      }),
    );
  });

  it("anchor-batch emits batch-anchored with the entry count", () => {
    const { events } = simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [Cl.list([entry(1), entry(2), entry(3)])],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("batch-anchored"),
        "batch-id": Cl.uint(1),
        owner: Cl.principal(wallet1),
        count: Cl.uint(3),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
      }),
    );
  });

  it("batch-anchored count matches a five-entry list", () => {
    const entries = Array.from({ length: 5 }, (_, i) => entry(i + 1));
    const { events } = simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [Cl.list(entries)],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("batch-anchored"),
        "batch-id": Cl.uint(1),
        owner: Cl.principal(wallet1),
        count: Cl.uint(5),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
      }),
    );
  });

  it("register-anchor emits anchor-registered", () => {
    const { events } = simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("anchor-registered"),
        owner: Cl.principal(wallet1),
        index: Cl.uint(0),
        hash: hashN(1),
        label: Cl.stringAscii("doc-1"),
        "anchored-at": Cl.uint(simnet.stacksBlockHeight),
      }),
    );
  });

  it("mint-proof emits proof-minted with the token id", () => {
    const { events } = simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("proof-minted"),
        "token-id": Cl.uint(1),
        hash: hashN(1),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
        "burn-block": Cl.uint(simnet.burnBlockHeight),
      }),
    );
  });

  it("create-group emits group-created", () => {
    const { events } = simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("team")],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("group-created"),
        "group-id": Cl.uint(1),
        name: Cl.stringAscii("team"),
        admin: Cl.principal(wallet1),
        "created-at": Cl.uint(simnet.stacksBlockHeight),
      }),
    );
  });

  it("add-member emits member-added", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { events } = simnet.callPublicFn(
      "thesislock-groups",
      "add-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("member-added"),
        "group-id": Cl.uint(1),
        member: Cl.principal(wallet2),
        "added-at": Cl.uint(simnet.stacksBlockHeight),
      }),
    );
  });

  it("remove-member emits member-removed", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    simnet.callPublicFn(
      "thesislock-groups",
      "add-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1,
    );
    const { events } = simnet.callPublicFn(
      "thesislock-groups",
      "remove-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("member-removed"),
        "group-id": Cl.uint(1),
        member: Cl.principal(wallet2),
      }),
    );
  });

  it("anchor-to-group emits group-anchor-added", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const { events } = simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(1), hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("group-anchor-added"),
        "group-id": Cl.uint(1),
        index: Cl.uint(0),
        hash: hashN(1),
        label: Cl.stringAscii("doc-1"),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(simnet.stacksBlockHeight),
      }),
    );
  });

  it("the anchor-created event matches the stored anchor record", () => {
    const { events } = simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("doc-1")],
      wallet1,
    );
    const stacks = simnet.stacksBlockHeight;
    const burn = simnet.burnBlockHeight;
    const stored = simnet.callReadOnlyFn(
      "thesislock",
      "get-anchor",
      [hashN(1)],
      wallet1,
    ).result;
    expect(stored).toBeSome(
      Cl.tuple({
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(stacks),
        "burn-block": Cl.uint(burn),
        label: Cl.stringAscii("doc-1"),
      }),
    );
    expect(printOf(events)).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("anchor-created"),
        hash: hashN(1),
        "anchored-by": Cl.principal(wallet1),
        "stacks-block": Cl.uint(stacks),
        "burn-block": Cl.uint(burn),
        label: Cl.stringAscii("doc-1"),
      }),
    );
  });
});
