import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, H3, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/web-app" },
  title: { absolute: "Web App Guide | ThesisLock Docs" },
  description:
    "Anchor single files and batches, use groups, verify, run bulk checks, export history, and mint proof NFTs from the ThesisLock web app.",
};

export default function WebApp() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Web App Guide</h1>
      <Lead>
        The web app at thesis-lock.vercel.app is where documents are anchored
        and verified. Every page hashes files in your browser; the file itself
        never leaves your device.
      </Lead>

      <H2>Connecting a wallet</H2>
      <P>
        Anchoring writes to the chain, so it needs a Stacks wallet and a small
        amount of STX for the fee. Click Connect and approve through Stacks
        Connect (Leather, Xverse, or Asigna). Verification, search, and the
        public feed need no wallet at all.
      </P>

      <H2>Anchor a single file</H2>
      <List
        items={[
          <>
            Open the{" "}
            <Link href="/anchor" className="underline hover:text-foreground">
              anchor page
            </Link>{" "}
            and connect your wallet.
          </>,
          <>Drop a file onto the page or pick one. It is hashed in place.</>,
          <>Add an optional label (up to 64 ASCII characters).</>,
          <>
            Sign the transaction. The app polls Hiro and slides in a toast when
            the anchor lands on chain, with a link to its verify page.
          </>,
        ]}
      />
      <P>
        The single-file anchor writes to the <Code>thesislock</Code> contract
        and, in the same flow, registers the anchor in your per-wallet history.
      </P>

      <H2>Batch anchoring</H2>
      <P>
        Need to anchor several files at once? The batch flow anchors up to ten
        hashes in a single transaction against <Code>thesislock-batch</Code>,
        which is cheaper than ten separate anchors. Duplicate hashes you have
        already batched are skipped silently, so overlapping batches still
        succeed.
      </P>
      <P>
        Batch anchors are keyed by both hash and owner. When you share a
        batch-anchored hash, include your principal in the verify link:{" "}
        <Code>/v/&lt;hash&gt;?owner=&lt;principal&gt;</Code>. The batch success
        screen and the My Anchors page generate links that already include it.
      </P>

      <H2>Groups</H2>
      <P>
        Groups let several wallets anchor under a shared, on-chain history,
        useful for thesis committees, legal teams, or research labs collecting
        submissions. On the{" "}
        <Link href="/groups" className="underline hover:text-foreground">
          groups page
        </Link>
        :
      </P>
      <List
        items={[
          <>An admin creates a named group.</>,
          <>
            The admin adds or removes members. Non-admin attempts are rejected
            on chain.
          </>,
          <>
            Any member anchors documents to the group, appending to a history
            keyed by group and index.
          </>,
        ]}
      />

      <H2>Verifying</H2>
      <H3>Single verification</H3>
      <P>
        Visit <Code>/v/&lt;hash&gt;</Code>, or re-upload the file on the verify
        page to compute its hash and check it against the chain. A match shows
        when it was anchored, by which wallet, and the label. For batch anchors,
        append <Code>?owner=&lt;principal&gt;</Code>.
      </P>
      <H3>Bulk verification</H3>
      <P>
        The{" "}
        <Link href="/verify-bulk" className="underline hover:text-foreground">
          bulk verify page
        </Link>{" "}
        accepts multiple files at once, checks them all against the chain in a
        single pass, and exports the results as CSV.
      </P>

      <H2>Finding anchors</H2>
      <List
        items={[
          <>
            <Link href="/search" className="underline hover:text-foreground">
              Search
            </Link>{" "}
            finds anchored documents across every contract by hash, wallet
            address, or label, auto-detecting the query type.
          </>,
          <>
            <Link href="/feed" className="underline hover:text-foreground">
              The feed
            </Link>{" "}
            shows recent on-chain anchor activity across all wallets, refreshing
            every minute.
          </>,
          <>
            <Link href="/anchors" className="underline hover:text-foreground">
              My Anchors
            </Link>{" "}
            lists your wallet's history, populated automatically when you
            anchor, with export.
          </>,
          <>
            <Link href="/stats" className="underline hover:text-foreground">
              Stats
            </Link>{" "}
            summarizes protocol-wide totals and recent activity.
          </>,
        ]}
      />

      <H2>Proof NFTs</H2>
      <P>
        Optionally mint a soulbound proof token (SIP-009): a non-transferable
        NFT that stays in your wallet as permanent evidence of an anchor.
        Transfers always fail by design, and each unique hash can mint only one
        proof.
      </P>

      <H2>Embeddable badges</H2>
      <P>
        Once a document is anchored, the{" "}
        <Link href="/embed" className="underline hover:text-foreground">
          embed page
        </Link>{" "}
        generates a shields-style "Verified on Stacks" SVG badge and a social
        sharing card for any hash, with copy-paste Markdown and HTML snippets.
        See the{" "}
        <Link href="/docs/api" className="underline hover:text-foreground">
          API Reference
        </Link>{" "}
        for the badge and card endpoints.
      </P>
    </div>
  );
}
