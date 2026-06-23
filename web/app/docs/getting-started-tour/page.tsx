import type { Metadata } from "next";
import Link from "next/link";
import { H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/getting-started-tour" },
  title: { absolute: "Getting Started Tour | ThesisLock Docs" },
  description:
    "The interactive onboarding tour walks first-time visitors through ThesisLock's main features. Learn what it covers and how to restart it.",
};

export default function GettingStartedTour() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Getting Started Tour</h1>
      <Lead>
        ThesisLock has grown a lot of surface area. The onboarding tour is a
        short, guided walkthrough that highlights the features a new visitor is
        most likely to need, one step at a time, without sending you to read a
        manual first.
      </Lead>

      <H2>When it starts</H2>
      <P>
        The first time you visit, the tour starts on its own after a brief pause.
        You can also launch it yourself: a &ldquo;Take a tour&rdquo; link sits on
        the landing page, and every page footer has a &ldquo;Restart onboarding
        tour&rdquo; button. Once you finish or skip it, ThesisLock remembers your
        choice in this browser and will not start it automatically again.
      </P>

      <H2>What it covers</H2>
      <P>
        The tour is a sixteen-step sequence. It highlights each target element on
        the page and explains it in a short tooltip, with Back, Next, and Skip
        controls and a step counter. When a step lives on another page, the
        tooltip offers a button that navigates there and continues. The steps
        cover:
      </P>
      <List
        items={[
          <>Anchoring a single document, including the file drop zone and label.</>,
          <>Structured labels with anchor templates.</>,
          <>Batch anchoring of up to ten files at once.</>,
          <>Your anchor history, cross-contract search, and groups.</>,
          <>Protocol-wide stats and your personal dashboard.</>,
          <>The watchlist for monitoring hashes, wallets, and groups.</>,
          <>The theme toggle, the keyboard shortcuts, and the developer portal.</>,
        ]}
      />

      <H2>Restarting the tour</H2>
      <P>
        Select &ldquo;Restart onboarding tour&rdquo; in the footer at any time.
        That clears the saved completion flag and immediately starts the tour
        from the beginning. Prefer the keyboard? Open the{" "}
        <Link
          href="/docs/command-palette"
          className="underline hover:text-foreground"
        >
          command palette
        </Link>{" "}
        with Ctrl+K and run the &ldquo;Start tour&rdquo; action.
      </P>
    </div>
  );
}
