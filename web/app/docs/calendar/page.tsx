import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/calendar" },
  title: { absolute: "Calendar | ThesisLock Docs" },
  description:
    "ThesisLock's calendar view: a GitHub-style contribution graph, a monthly calendar, and streak tracking built from your on-chain anchoring history.",
};

export default function CalendarDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Calendar</h1>
      <Lead>
        The{" "}
        <Link href="/calendar" className="underline hover:text-foreground">
          calendar
        </Link>{" "}
        maps your anchoring activity to dates so you can see your patterns, find
        anchors by day, and keep a daily streak going. It is built entirely from
        your wallet&apos;s on-chain history read from the Hiro API, so it works
        the moment you connect a wallet.
      </Lead>

      <H2>Two views</H2>
      <List
        items={[
          <>
            <strong>Contribution graph</strong>: a year of activity as a grid of
            squares, one per day, shaded by how many documents you anchored.
            Hover a square for the date and count, or select it to see that
            day&apos;s anchors.
          </>,
          <>
            <strong>Monthly calendar</strong>: a traditional month grid with a
            dot and count on active days. Today is outlined and future days are
            dimmed. Move between months with the arrows.
          </>,
        ]}
      />

      <H2>Streaks</H2>
      <P>
        The stats bar tracks your <Code>current streak</Code> (consecutive days
        with at least one anchor, counting up to today), your{" "}
        <Code>longest streak</Code>, the number of active days, and the total
        anchors for the selected year. An anchor on a day keeps the streak alive;
        the current day is not counted against you until it ends.
      </P>

      <H2>Day detail</H2>
      <P>
        Selecting a day opens a panel listing every anchor from that day with its
        source (single, batch, registry, group, or proof), parsed label, tags,
        and a link to verify. From there you can copy a hash, add an anchor to a
        collection, or generate a verification report for the whole day.
      </P>

      <H2>How counts work</H2>
      <P>
        Each anchored document counts once, so a batch of ten documents adds ten
        to that day. Dates use UTC. Activity is read from your wallet&apos;s
        transactions across all five contracts, the same source as the activity
        log.
      </P>

      <H2>Where it appears</H2>
      <P>
        Beyond the calendar page, a compact contribution graph shows your last 30
        days on the dashboard, and every public wallet profile shows that
        wallet&apos;s yearly pattern.
      </P>
    </div>
  );
}
