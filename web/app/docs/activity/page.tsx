import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Activity Log | ThesisLock Docs" },
  description:
    "A unified per-wallet timeline of every ThesisLock contract interaction, with category filters, infinite scroll, and a JSON API.",
};

export default function ActivityDoc() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Activity Log</h1>
      <Lead>
        The activity log is a single chronological timeline of every interaction
        a wallet has had with any ThesisLock contract: single anchors, batch
        anchors, registry entries, proof mints, and every group action.
      </Lead>

      <H2>How it differs</H2>
      <P>
        ThesisLock surfaces wallet history in three places, each with a distinct
        purpose:
      </P>
      <List
        items={[
          <>
            <Link href="/dashboard" className="underline hover:text-foreground">
              Dashboard
            </Link>{" "}
            shows charts and aggregate stats, plus a compact preview of the five
            most recent events.
          </>,
          <>
            <Link href="/anchors" className="underline hover:text-foreground">
              My Anchors
            </Link>{" "}
            lists only registry entries, the anchors recorded to a wallet&apos;s
            on-chain history.
          </>,
          <>
            <Link href="/activity" className="underline hover:text-foreground">
              Activity
            </Link>{" "}
            is the complete log: every contract call the wallet made, across all
            five contracts, newest first.
          </>,
        ]}
      />

      <H2>Event types</H2>
      <P>
        Each contract-call transaction is parsed into a typed event with a
        human-readable title and a single-character icon:
      </P>
      <Table
        headers={["Type", "Contract call", "Reads as"]}
        rows={[
          ["anchor", <Code key="a">anchor-document</Code>, "Anchored a document"],
          [
            "batch-anchor",
            <Code key="b">anchor-batch</Code>,
            "Batch anchored N documents",
          ],
          [
            "register",
            <Code key="r">register-anchor</Code>,
            "Registered anchor in history",
          ],
          [
            "mint-proof",
            <Code key="m">mint-proof</Code>,
            "Minted proof NFT #N",
          ],
          [
            "create-group",
            <Code key="c">create-group</Code>,
            "Created group",
          ],
          [
            "add-member",
            <Code key="am">add-member</Code>,
            "Added member to group",
          ],
          [
            "remove-member",
            <Code key="rm">remove-member</Code>,
            "Removed member from group",
          ],
          [
            "group-anchor",
            <Code key="g">anchor-to-group</Code>,
            "Anchored to group",
          ],
        ]}
      />

      <H2>Timeline and filters</H2>
      <P>
        Events are grouped under date separators (<Code>Today</Code>,{" "}
        <Code>Yesterday</Code>, then a calendar date) and color-coded by
        category: anchors are blue, group actions purple, proof mints gold, and
        registry entries gray. Filter pills at the top narrow the timeline to a
        single category:
      </P>
      <List
        items={[
          <>
            <strong>Anchors</strong>: single and batch anchors.
          </>,
          <>
            <strong>Groups</strong>: create group, add or remove member, and
            group anchors.
          </>,
          <>
            <strong>Proofs</strong>: proof NFT mints.
          </>,
          <>
            <strong>Registry</strong>: anchors recorded to wallet history.
          </>,
        ]}
      />
      <P>
        The timeline pages through the wallet&apos;s transactions as you scroll,
        loading more automatically until it reaches the end.
      </P>

      <H2>JSON API</H2>
      <P>
        The same data is available from a read-only endpoint. Pass a wallet{" "}
        <Code>address</Code>, an optional zero-based <Code>page</Code>, a{" "}
        <Code>limit</Code> (max 50), and an optional <Code>type</Code> of{" "}
        <Code>anchors</Code>, <Code>groups</Code>, <Code>proofs</Code>, or{" "}
        <Code>registry</Code>:
      </P>
      <CodeBlock language="bash">{`curl "https://thesislock.app/api/activity?address=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM&page=0&limit=20&type=anchors"`}</CodeBlock>
      <P>
        The response is <Code>{`{ events, total, hasMore }`}</Code>, where{" "}
        <Code>events</Code> is newest-first and <Code>hasMore</Code> indicates
        whether further pages remain.
      </P>
    </div>
  );
}
