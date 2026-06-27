import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, H3, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/explorer" },
  title: { absolute: "Contract Explorer | ThesisLock Docs" },
  description:
    "How to use the in-app contract explorer: browse functions, maps, and data variables, watch recent on-chain calls, read the architecture diagram, and call read-only functions interactively.",
};

export default function ExplorerDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Contract Explorer</h1>
      <Lead>
        The contract explorer at{" "}
        <Link href="/explorer" className="underline hover:text-foreground">
          /explorer
        </Link>{" "}
        turns ThesisLock into a self-documenting protocol. Every one of the five mainnet contracts
        is browsable from the app: its functions, maps, data variables, recent on-chain calls, and a
        live read-only tester, with no wallet required.
      </Lead>

      <H2>Layout</H2>
      <P>
        A sidebar lists the five contracts. Selecting one opens its detail view; the default
        Overview shows an architecture diagram and a card per contract with its live call count,
        function count, and deploy block.
      </P>

      <H2>Architecture diagram</H2>
      <P>
        The Overview diagram shows how the contracts relate. The core <Code>thesislock</Code> anchor
        sits at the center; the companion contracts <Code>thesislock-batch</Code> (batch
        operations), <Code>thesislock-registry</Code> (history index), and{" "}
        <Code>thesislock-proof</Code> (NFT proofs) extend it, while <Code>thesislock-groups</Code>{" "}
        is an independent contract for shared group anchoring. Every box is clickable and opens that
        contract.
      </P>

      <H2>Contract detail</H2>
      <P>Each contract detail view has three tabs.</P>

      <H3>Functions</H3>
      <P>
        Functions are grouped by access. Public functions (blue) write state and must be signed by a
        wallet; read-only functions (green) are free reads. Each entry lists its arguments, return
        type, and a description, and expands to show the Clarity signature.
      </P>

      <H3>Recent Calls</H3>
      <P>
        A live table of the most recent contract-call transactions from the Hiro API, with the
        function name, sender (linked to its wallet profile), block, status, and a link to the
        transaction in the Stacks explorer. It refreshes every 30 seconds and can be filtered by
        function name.
      </P>

      <H3>Try It</H3>
      <P>
        Call any read-only function interactively. Pick a function, fill the typed inputs, and the
        explorer serializes the arguments, calls the Hiro read-only API, and shows the result three
        ways: a formatted value, decoded JSON, and the raw Clarity value. Input types are handled
        for you:
      </P>
      <List
        items={[
          <>
            <Code>(buff 32)</Code>: a 64-character hex string (a SHA-256 hash).
          </>,
          <>
            <Code>principal</Code>: a Stacks address beginning <Code>SP</Code>.
          </>,
          <>
            <Code>uint</Code>: a non-negative integer.
          </>,
          <>
            <Code>(string-ascii N)</Code>: text up to N characters.
          </>,
          <>
            <Code>(optional X)</Code>: a checkbox to include the value plus a field for X.
          </>,
        ]}
      />

      <H2>JSON API</H2>
      <P>
        The same data is available as JSON for external tools.{" "}
        <Code>GET /api/explorer/&lt;contract&gt;</Code> returns the contract metadata and recent
        calls.{" "}
        <Code>
          GET /api/explorer/&lt;contract&gt;/call?fn=&lt;function&gt;&amp;args=&lt;json&gt;
        </Code>{" "}
        proxies a read-only call and returns the decoded result. For raw Clarity encoding details,
        see the{" "}
        <Link href="/docs/contracts" className="underline hover:text-foreground">
          Contracts
        </Link>{" "}
        reference.
      </P>
    </div>
  );
}
