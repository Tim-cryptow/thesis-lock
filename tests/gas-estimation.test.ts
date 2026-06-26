import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Informational gas/cost checks. Per-call cost data is only populated when the
// suite runs with `-- --costs` (a plain `npm test` leaves costs null), so these
// log the cost objects and the batch-vs-singles comparison, and only assert that
// the calls themselves succeed. They are observational, not strict thresholds.

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const hashN = (n: number) =>
  Cl.bufferFromHex(n.toString(16).padStart(2, "0").repeat(32));

type Costs = { total?: { runtime: number } } | null | undefined;
const runtimeOf = (c: Costs) => (c && c.total ? c.total.runtime : null);

describe("gas estimation (informational)", () => {
  it("logs the cost of a single anchor", () => {
    const r = simnet.callPublicFn(
      "thesislock",
      "anchor-document",
      [hashN(1), Cl.stringAscii("doc")],
      wallet1,
    );
    console.log("single-anchor costs:", JSON.stringify(r.costs));
    expect(r.result).toBeOk(Cl.bool(true));
  });

  it("compares a 10-entry batch against ten single anchors", () => {
    let singleTotal = 0;
    let haveSingle = true;
    for (let i = 1; i <= 10; i++) {
      const r = simnet.callPublicFn(
        "thesislock",
        "anchor-document",
        [hashN(i), Cl.stringAscii("doc")],
        wallet1,
      );
      const rt = runtimeOf(r.costs as Costs);
      if (rt === null) haveSingle = false;
      else singleTotal += rt;
    }
    const entries = Array.from({ length: 10 }, (_, i) =>
      Cl.tuple({ hash: hashN(100 + i), label: Cl.stringAscii("doc") }),
    );
    const batch = simnet.callPublicFn(
      "thesislock-batch",
      "anchor-batch",
      [Cl.list(entries)],
      wallet1,
    );
    const batchRt = runtimeOf(batch.costs as Costs);
    if (haveSingle && batchRt !== null) {
      console.log(
        `runtime: 10 singles=${singleTotal}, batch10=${batchRt}, batch cheaper=${batchRt < singleTotal}`,
      );
    } else {
      console.log("cost data unavailable (run with -- --costs to compare)");
    }
    expect(batch.result).toBeOk(Cl.uint(1));
  });

  it("logs the cost of a registry registration", () => {
    const r = simnet.callPublicFn(
      "thesislock-registry",
      "register-anchor",
      [hashN(1), Cl.stringAscii("doc")],
      wallet1,
    );
    console.log("register-anchor costs:", JSON.stringify(r.costs));
    expect(r.result).toBeOk(Cl.uint(0));
  });

  it("logs the cost of minting a proof", () => {
    const r = simnet.callPublicFn(
      "thesislock-proof",
      "mint-proof",
      [hashN(1), Cl.stringAscii("doc")],
      wallet1,
    );
    console.log("mint-proof costs:", JSON.stringify(r.costs));
    expect(r.result).toBeOk(Cl.uint(1));
  });

  it("logs the cost of creating a group", () => {
    const r = simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    console.log("create-group costs:", JSON.stringify(r.costs));
    expect(r.result).toBeOk(Cl.uint(1));
  });

  it("logs the cost of anchoring to a group", () => {
    simnet.callPublicFn(
      "thesislock-groups",
      "create-group",
      [Cl.stringAscii("g")],
      wallet1,
    );
    const r = simnet.callPublicFn(
      "thesislock-groups",
      "anchor-to-group",
      [Cl.uint(1), hashN(1), Cl.stringAscii("doc")],
      wallet1,
    );
    console.log("anchor-to-group costs:", JSON.stringify(r.costs));
    expect(r.result).toBeOk(Cl.uint(0));
  });
});
