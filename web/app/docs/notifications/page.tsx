import type { Metadata } from "next";
import Link from "next/link";
import { H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Notifications | ThesisLock Docs" },
  description:
    "How the ThesisLock notification center works: the sources it aggregates, the corner bell, browser push, sound alerts, and per-type preferences, all stored in your browser.",
};

export default function NotificationsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Notifications</h1>
      <Lead>
        The notification center gathers everything worth knowing about into one
        place: when your transactions confirm, when something you watch changes,
        when new documents are anchored on the protocol, and when group
        membership changes. A bell in the corner of every page shows the unread
        count and the most recent items, and the{" "}
        <Link href="/notifications" className="underline hover:text-foreground">
          notifications page
        </Link>{" "}
        lists the full history with filters and preferences.
      </Lead>

      <H2>What you get notified about</H2>
      <List
        items={[
          "Transaction confirmations and failures, mirrored from the in-app transaction tracker, with a link to verify a confirmed anchor.",
          "Watchlist updates: a watched hash becoming anchored, or a watched wallet or group gaining new anchors, detected on each watchlist check.",
          "New protocol anchors observed live from the chain, as low-priority items.",
          "Group activity, such as adding a member to a group you administer.",
          "System messages from the app.",
        ]}
      />

      <H2>The bell and the page</H2>
      <P>
        The bell shows an unread count (capped at 99+) and a dropdown of the five
        most recent notifications; opening one marks it read and follows its
        link. The notifications page adds filter tabs (transactions, watchlist,
        protocol, system), per-item dismiss, and mark-all-read or clear-all.
      </P>

      <H2>Browser push and sound</H2>
      <P>
        For high-priority events you can opt in to native browser push
        notifications. The app asks for permission the first time you enable
        them and never shows them otherwise. A short chime, synthesized in the
        browser with no audio files, can play for new notifications while the tab
        is visible. Both are off unless the matching preference is on, and the
        chime is rate-limited so a burst never becomes noise.
      </P>

      <H2>Preferences and privacy</H2>
      <P>
        Preferences live at the bottom of the notifications page: a master
        switch, browser push, sound, and a per-type toggle for each source.
        Everything is stored in your browser. Notifications are never sent to a
        server, and the list is capped so it cannot grow without bound.
      </P>
    </div>
  );
}
