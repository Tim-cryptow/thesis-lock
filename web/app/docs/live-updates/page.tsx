import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Live Updates | ThesisLock Docs" },
  description:
    "How ThesisLock's real-time live updates work: the event ticker, auto-updating feed, stats, and explorer, what they poll, and how to pause or resume.",
};

export default function LiveUpdatesDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Live Updates</h1>
      <Lead>
        ThesisLock keeps the app in sync with the chain in real time. New anchors
        appear in the{" "}
        <Link href="/feed" className="underline hover:text-foreground">
          feed
        </Link>{" "}
        as they land, the{" "}
        <Link href="/stats" className="underline hover:text-foreground">
          stats
        </Link>{" "}
        counters tick up, the{" "}
        <Link href="/explorer" className="underline hover:text-foreground">
          contract explorer
        </Link>{" "}
        surfaces fresh calls, and a live ticker along the top of the page shows
        protocol activity as it happens, all without a manual refresh.
      </Lead>

      <H2>How it works</H2>
      <P>
        A single background poller checks the public Hiro API for new contract
        events every fifteen seconds and broadcasts anything new to the pages
        that are open. There is no websocket and no server in between: reads go
        directly to the same public API the rest of the app uses, so live updates
        add no new trust assumptions.
      </P>
      <List
        items={[
          <>
            <strong>Visibility aware</strong>: polling pauses automatically when
            the browser tab is hidden and resumes the moment you return, so a
            backgrounded tab does not keep hitting the API.
          </>,
          <>
            <strong>Resilient</strong>: if the API has a hiccup, the poller backs
            off (fifteen seconds, then thirty, then sixty) and resets to its
            normal cadence once requests succeed again.
          </>,
          <>
            <strong>Baseline first</strong>: opening the app records the latest
            event without replaying history, so the ticker shows new activity
            from that point on rather than flooding with old events.
          </>,
        ]}
      />

      <H2>The live ticker</H2>
      <P>
        The ticker is the scrolling bar at the top of the page. Each item links to
        the relevant verification or wallet page, and the bar auto-hides when
        there has been no activity for a few minutes. Use <Code>Collapse</Code> to
        shrink it to a single line; the choice is remembered in your browser.
      </P>

      <H2>The Live indicator</H2>
      <P>
        A small status dot shows the connection state wherever live updates are
        active: a pulsing green dot means updates are flowing, red means the last
        poll hit a network error and is retrying, and gray means updates are
        paused.
      </P>

      <H2>Pausing and resuming</H2>
      <P>
        Click the <Code>Live</Code> indicator (in the page footer, next to the
        feed and stats headings, or on the ticker) to pause live updates, and
        click it again to resume. Your preference is saved in your browser, so the
        app stays paused across reloads until you turn it back on. While paused,
        the app stops polling entirely.
      </P>
    </div>
  );
}
