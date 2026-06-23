import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/watchlist" },
  title: { absolute: "Watchlist | ThesisLock Docs" },
  description:
    "Monitor specific document hashes, wallets, and groups over time with the ThesisLock watchlist: save what you care about and track verification status and new anchors in one place.",
};

export default function WatchlistDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Watchlist</h1>
      <Lead>
        The watchlist at{" "}
        <Link href="/watchlist" className="underline hover:text-foreground">
          /watchlist
        </Link>{" "}
        lets you keep an eye on the hashes, wallets, and groups you care about.
        Save them once and check back to see whether a hash has been anchored or
        whether a wallet or group has new anchors since you last looked.
      </Lead>

      <H2>What you can watch</H2>
      <List
        items={[
          <>
            <strong>Hashes</strong>: track whether a specific document hash has
            been anchored. The status shows Verified once it appears on chain
            (through the single-anchor or proof contract), or Not Found until
            then.
          </>,
          <>
            <strong>Wallets</strong>: follow a Stacks wallet and see its total
            registered anchors, with a marker when new ones appear.
          </>,
          <>
            <strong>Groups</strong>: monitor a group&apos;s shared history and
            see when members add new anchors.
          </>,
        ]}
      />

      <H2>Use cases</H2>
      <List
        items={[
          "Watch a hash you expect a collaborator to anchor, and get a clear signal the moment it lands on chain.",
          "Follow a wallet (a co-author, a counterparty, an organization) to notice new anchors without scanning the feed.",
          "Keep a thesis committee or legal team's group in view and track its growing shared record.",
        ]}
      />

      <H2>Adding items</H2>
      <P>
        Add items directly on the watchlist page with the form, or use the watch
        button (the bookmark icon) that appears next to hashes and addresses on
        the verify, profile, group, search, and feed pages. When a hash you look
        up is not anchored yet, the verify page offers to add it so you find out
        when it does.
      </P>

      <H2>Checking status</H2>
      <P>
        Each item shows its last-checked time. The watchlist auto-checks when you
        open it (at most once every five minutes), and you can refresh a single
        item with <Code>Check now</Code> or everything with <Code>Check All</Code>.
        Items with new anchors since the previous check are flagged, and the
        count surfaces as a badge on the <Code>Watchlist</Code> nav link and the
        dashboard summary widget.
      </P>

      <H2>Where it is stored</H2>
      <P>
        The watchlist lives only in your browser&apos;s local storage. There is
        no account and nothing is sent to a server: status checks read the public
        Hiro API directly, the same as the rest of the app. Clearing site data
        removes it, and it does not sync across devices.
      </P>
    </div>
  );
}
