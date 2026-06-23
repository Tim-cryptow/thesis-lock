import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/data-portability" },
  title: { absolute: "Data Portability | ThesisLock Docs" },
  description:
    "Back up, restore, and move all of your ThesisLock data between browsers and devices, and control exactly what is stored, from the settings page.",
};

export default function DataPortabilityDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Data Portability</h1>
      <Lead>
        ThesisLock keeps everything on your device: collections, tags, watchlist,
        audit log, notifications, preferences, and more all live in your
        browser&apos;s local storage. The settings page at{" "}
        <Link href="/settings" className="underline hover:text-foreground">
          /settings
        </Link>{" "}
        lets you back all of it up, restore it elsewhere, and control what is
        kept.
      </Lead>

      <H2>Backing up</H2>
      <P>
        Under Data Management, choose <Code>Export All Data</Code> to download a
        single <Code>thesislock-backup-YYYY-MM-DD.json</Code> file containing
        every namespaced key in your browser, with a version stamp and the time
        of export. The page remembers when you last backed up and shows a
        reminder once a backup is more than thirty days old.
      </P>

      <H2>Restoring</H2>
      <P>
        Drop a backup file into the Restore area to see a preview: its version,
        when it was exported, and which categories it contains. Then choose how to
        apply it:
      </P>
      <List
        items={[
          <>
            <Code>Merge with existing</Code>: keep your current data and add
            anything new. Collections and tags are combined rather than
            overwritten.
          </>,
          <>
            <Code>Replace all data</Code>: erase the current data first, then load
            the backup exactly as saved.
          </>,
        ]}
      />
      <P>
        Both modes only ever write keys inside the ThesisLock namespace, and the
        import reports how many items were imported, skipped, or failed.
      </P>

      <H2>Storage and cleanup</H2>
      <P>
        The storage overview shows how much local storage ThesisLock is using,
        broken down by category, with a color-coded usage bar. You can clear a
        single category, clear specific data types from the Privacy tab, or use
        the danger zone to remove everything after confirming.
      </P>

      <H2>Privacy controls</H2>
      <P>
        The Privacy tab lets you turn action tracking and performance monitoring
        on or off, set how long audit entries are kept (7, 30, 90 days, or
        unlimited), and clear search history, API request history, performance
        data, the audit log, or notifications individually. It also lists exactly
        what is stored on your device and confirms that nothing is sent to any
        server except the Stacks transactions you sign.
      </P>

      <H2>Preferences</H2>
      <P>
        Theme, language, notifications, live updates, the performance overlay, the
        ticker bar, and your default anchor template are all centralized under
        Preferences and saved to your browser the moment you change them.
      </P>
    </div>
  );
}
