import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Empty States | ThesisLock Docs" },
  description:
    "What you see when a page has no data yet: a clear explanation of what belongs there and a button that points you to the next step.",
};

export default function EmptyStatesDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Empty States</h1>
      <Lead>
        A brand-new wallet has no anchors, no history, and an empty watchlist.
        Rather than a bare no-data line, every page that can be empty shows a
        short explanation of what belongs there and a button that points you to
        the next step.
      </Lead>

      <H2>What an empty state includes</H2>
      <List
        items={[
          <>An icon that signals the kind of content the page holds.</>,
          <>
            A title naming what is missing, such as <Code>No anchors yet</Code>.
          </>,
          <>A sentence explaining what will appear here and why.</>,
          <>
            A primary action, such as <Code>Anchor a Document</Code>, and
            sometimes a quieter secondary link.
          </>,
        ]}
      />

      <H2>Where you will see them</H2>
      <P>
        Empty states appear across the app: your{" "}
        <Link href="/anchors" className="underline hover:text-foreground">
          anchors
        </Link>
        , the protocol{" "}
        <Link href="/feed" className="underline hover:text-foreground">
          feed
        </Link>
        ,{" "}
        <Link href="/groups" className="underline hover:text-foreground">
          groups
        </Link>
        ,{" "}
        <Link href="/search" className="underline hover:text-foreground">
          search
        </Link>
        , the dashboard, activity, watchlist, collections, calendar,
        notifications, the audit trail, and the developer API keys. Each one is
        tailored to the page it lives on.
      </P>

      <H2>For contributors</H2>
      <P>
        These are built from a single reusable EmptyState component, so a new
        page can adopt the same pattern by supplying an icon, a title, a
        description, and an optional action. Keeping them consistent means the
        app reads the same way no matter where a new user lands first.
      </P>
    </div>
  );
}
