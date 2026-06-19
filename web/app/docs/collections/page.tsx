import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Collections | ThesisLock Docs" },
  description:
    "Organize anchored documents into named, browser-local collections with ThesisLock: create folders, add anchors by hash, file, or wallet, and share a collection as a link or import one.",
};

export default function CollectionsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Collections</h1>
      <Lead>
        Collections at{" "}
        <Link href="/collections" className="underline hover:text-foreground">
          /collections
        </Link>{" "}
        are a lightweight way to organize the anchors you care about into named
        folders, like playlists for your document proofs. They are separate from
        on-chain groups: collections are purely organizational, live only in your
        browser, and never touch the chain.
      </Lead>

      <H2>Collections vs. groups</H2>
      <P>
        Groups are an on-chain, multi-wallet construct: members share a contract
        record and anchor documents under one roof. Collections are the opposite
        end of the spectrum. They are private to your browser, hold any hashes
        you like (yours or anyone&apos;s), and are meant for sorting and sharing,
        not for shared authorship.
      </P>

      <H2>Creating a collection</H2>
      <P>
        On the collections page, choose <Code>New Collection</Code>, give it a
        name, an optional description, and pick one of eight colors and eight
        icons. The card&apos;s colored bar and icon make collections easy to tell
        apart at a glance.
      </P>

      <H2>Adding anchors</H2>
      <List
        items={[
          <>
            <strong>By hash</strong>: paste a 64-character document hash, with an
            optional note.
          </>,
          <>
            <strong>By file</strong>: drop a file and it is hashed locally in your
            browser, then the hash is added. The file never leaves your device.
          </>,
          <>
            <strong>From My Anchors</strong>: connect your wallet to pull in your
            recent anchors with one click.
          </>,
          <>
            <strong>From anywhere</strong>: the collect button (the folder icon)
            next to hashes on the verify, anchors, search, and feed pages adds a
            hash to one or more collections without leaving the page.
          </>,
        ]}
      />

      <H2>Working with a collection</H2>
      <P>
        Open a collection to rename it, edit its description, color, and icon,
        reorder items, add per-item notes, and remove items. Bulk actions cover
        the whole set: <Code>Verify All</Code> checks every hash on chain,{" "}
        <Code>Generate Report</Code> builds a formal verification report, and{" "}
        <Code>Export CSV</Code> downloads the list.
      </P>

      <H2>Sharing and importing</H2>
      <P>
        Use <Code>Share link</Code> to produce a URL that carries the entire
        collection, encoded in the link itself. Anyone who opens it sees a
        read-only view with each hash&apos;s verification status and can import
        the collection into their own browser. You can also{" "}
        <Code>Export JSON</Code> and import that file from the collections page.
      </P>

      <H2>Where it is stored</H2>
      <P>
        Collections live only in your browser&apos;s local storage. There is no
        account and nothing is sent to a server: verification reads the public
        Hiro API directly, like the rest of the app. Clearing site data removes
        your collections, and they do not sync across devices. A shared link is
        the way to move a collection somewhere else.
      </P>
    </div>
  );
}
