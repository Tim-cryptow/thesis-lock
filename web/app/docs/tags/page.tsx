import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/tags" },
  title: { absolute: "Tags | ThesisLock Docs" },
  description:
    "Add flexible tags to your anchors, filter by tag across the app, and manage tags with a cloud, stats, rename, merge, and delete. All stored locally in your browser.",
};

export default function TagsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Tags</h1>
      <Lead>
        Tags are a lightweight way to categorize your anchors beyond their label
        or a collection. Add as many tags as you like to any anchor, then filter
        by tag wherever your anchors appear. Like collections and the watchlist,
        tags live only in your browser and never touch the chain or a server.
      </Lead>

      <H2>Tagging an anchor</H2>
      <P>
        Anywhere you own an anchor, a tag editor is available: on the{" "}
        <Link href="/anchors" className="underline hover:text-foreground">
          history
        </Link>{" "}
        page (use <Code>Add tags</Code> on a row), on the verify page when the
        connected wallet anchored the document, right after a successful anchor,
        and on each item inside a collection. Type a tag and press Enter, pick
        one from the suggestions, or paste a comma-separated list to add several
        at once. Each anchor holds up to ten tags.
      </P>

      <H2>Suggestions</H2>
      <P>
        The editor suggests tags from the anchor's label. Labels created from a
        template are recognized by their prefix, so a paper offers{" "}
        <Code>academic</Code> and <Code>research</Code>, a legal document offers{" "}
        <Code>contract</Code> and <Code>compliance</Code>, and workflow words
        like <Code>draft</Code> or <Code>final</Code> found in the label are
        offered too.
      </P>

      <H2>Filtering by tag</H2>
      <List
        items={[
          <>
            On the <Link href="/anchors" className="underline hover:text-foreground">history</Link>{" "}
            page, a tag bar narrows your anchors, and the pills on each row are
            clickable filters.
          </>,
          <>
            The <Link href="/feed" className="underline hover:text-foreground">feed</Link>{" "}
            and <Link href="/search" className="underline hover:text-foreground">search</Link>{" "}
            pages add a tag filter that keeps only entries whose hash carries a
            selected tag.
          </>,
          "Selecting several tags shows entries that match any of them.",
        ]}
      />

      <H2>The tags page</H2>
      <P>
        The{" "}
        <Link href="/tags" className="underline hover:text-foreground">
          tags page
        </Link>{" "}
        shows a tag cloud sized by how often each tag is used, the most used
        tags, recently added tags, and a count of your untagged anchors. The
        management table lets you recolor a tag with an editable swatch, rename a
        tag across every anchor, merge one tag into another, and delete a tag.
      </P>

      <H2>Exports and privacy</H2>
      <P>
        Tags are saved in your browser and are visible only to you. Exporting a
        collection includes the tags on its items, so importing that file
        restores them. Nothing about your tags is ever published on chain or sent
        to a server.
      </P>
    </div>
  );
}
