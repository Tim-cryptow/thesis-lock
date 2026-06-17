import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Wallet Profiles | ThesisLock Docs" },
  description:
    "Public per-wallet profile pages with anchoring stats, recent anchors, document types, a JSON API, and an embeddable badge.",
};

export default function WalletProfilesDoc() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Wallet Profiles</h1>
      <Lead>
        Every Stacks wallet has a public profile at{" "}
        <Code>/u/&lt;principal&gt;</Code> that turns its anchoring history into a
        verifiable portfolio. Researchers can share a profile link to prove a
        document history; organizations can showcase their anchoring activity.
      </Lead>

      <H2>What a profile shows</H2>
      <P>
        Profiles are public and need no wallet connection. Each one aggregates a
        wallet&apos;s activity across all five ThesisLock contracts:
      </P>
      <List
        items={[
          <>The full principal, with a copy button and an explorer link.</>,
          <>
            First and last activity blocks, so visitors can see how long the
            wallet has been anchoring.
          </>,
          <>
            Totals for single anchors, batch transactions, groups created, and
            proof NFTs minted.
          </>,
          <>
            The last ten anchors from the registry, each with its parsed label
            and a verify link.
          </>,
          <>
            The wallet&apos;s top document types, derived from its anchor labels
            via the{" "}
            <Link href="/docs/templates" className="underline hover:text-foreground">
              template system
            </Link>
            .
          </>,
        ]}
      />

      <H2>Data sources</H2>
      <P>
        Profile data combines two reads. The authoritative anchor count and
        recent anchors come from the <Code>thesislock-registry</Code> read-only
        functions. The batch, group, and proof totals plus the first and last
        activity blocks are derived from the wallet&apos;s contract-call history
        on the Hiro API, the same source the{" "}
        <Link href="/docs/activity" className="underline hover:text-foreground">
          activity log
        </Link>{" "}
        uses.
      </P>

      <H2>JSON API</H2>
      <P>
        The profile is also available as JSON, cached at the edge for five
        minutes. An invalid principal returns <Code>400</Code>.
      </P>
      <CodeBlock>{`GET /api/profile/<principal>

{
  "address": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
  "totalAnchors": 12,
  "totalBatches": 3,
  "groupsCreated": 1,
  "proofNFTs": 2,
  "firstSeen": 7798720,
  "lastSeen": 8123456,
  "recentAnchors": [
    { "hash": "ab12...", "label": "paper-title:thesis|v:2", "anchoredAt": 8123456 }
  ],
  "topLabels": ["paper", "release"]
}`}</CodeBlock>

      <H2>Embeddable badge</H2>
      <P>
        Each profile exposes a shields-style SVG badge showing the wallet&apos;s
        anchor count. It is green when the wallet has anchored at least once and
        gray otherwise, and is cached for ten minutes.
      </P>
      <CodeBlock>{`![ThesisLock Profile](https://thesis-lock.vercel.app/api/profile-badge/<principal>)`}</CodeBlock>

      <H2>Endpoints</H2>
      <Table
        headers={["Route", "Returns"]}
        rows={[
          [<Code key="p">/u/&lt;principal&gt;</Code>, "Public profile page"],
          [
            <Code key="j">/api/profile/&lt;principal&gt;</Code>,
            "Profile data as JSON",
          ],
          [
            <Code key="b">/api/profile-badge/&lt;principal&gt;</Code>,
            "Anchor-count SVG badge",
          ],
        ]}
      />

      <P>
        Owner principals across the{" "}
        <Link href="/feed" className="underline hover:text-foreground">
          feed
        </Link>{" "}
        and verification pages link straight to the matching profile.
      </P>
    </div>
  );
}
