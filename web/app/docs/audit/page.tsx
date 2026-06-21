import type { Metadata } from "next";
import Link from "next/link";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Audit Trail | ThesisLock Docs" },
  description:
    "ThesisLock's compliance-grade audit trail: how every action is recorded in a tamper-evident local log, how integrity verification works, and how to generate chain-of-custody reports.",
};

export default function AuditDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Audit Trail</h1>
      <Lead>
        For academic and legal use, ThesisLock keeps a tamper-evident record of
        every action taken in your browser. The{" "}
        <Link href="/audit" className="underline hover:text-foreground">
          audit trail
        </Link>{" "}
        timestamps each action, ties it to a session, lets you verify the log has
        not been altered, and exports a chain-of-custody report. Like the rest of
        the app it is entirely client-side: nothing is sent to a server.
      </Lead>

      <H2>What is recorded</H2>
      <P>
        Each entry captures the action, a category, the actor (the connected
        wallet, when one is connected), the target (a hash, principal, or path),
        a timestamp, the session id, and the browser user agent. Recorded actions
        include page views, anchor and batch submissions, verification checks,
        proof mints, group create and membership changes, searches, exports,
        certificate downloads, report generation, and wallet connect and
        disconnect.
      </P>

      <H2>Integrity verification</H2>
      <P>
        On every write, the log stores a <Code>SHA-256</Code> digest computed
        over the id and timestamp of every entry, in order. The{" "}
        <Code>Verify log integrity</Code> button recomputes that digest from the
        current entries and compares it to the stored value. A match confirms the
        log is intact; a mismatch means an entry was added, removed, reordered, or
        edited outside the app, which is exactly the tamper signal a compliance
        reviewer looks for.
      </P>

      <H2>Compliance reports</H2>
      <P>
        From the audit page you can generate a report over a date range. It
        includes an executive summary (total actions, unique actors, and a
        per-action breakdown), the integrity hash with an explanation, and the
        full entry list. Export it as:
      </P>
      <List
        items={[
          <>
            <strong>JSON</strong>: the complete report object, including the
            integrity hash, for machine processing or archival.
          </>,
          <>
            <strong>CSV</strong>: one row per entry, for spreadsheets and data
            review.
          </>,
          <>
            <strong>HTML</strong>: a self-contained, printable document styled
            like the verification reports, suitable for sharing or filing.
          </>,
        ]}
      />

      <H2>Use cases</H2>
      <List
        items={[
          "Demonstrating the chain of custody for a thesis or dataset across drafts and submissions.",
          "Producing an evidence log for a legal filing that shows exactly when each document was anchored and verified.",
          "Internal review of who acted on which documents and when, without standing up any logging infrastructure.",
        ]}
      />

      <H2>Privacy and limits</H2>
      <P>
        The log lives only in this browser, capped at the most recent 2000
        entries. There is no server, so no IP address is collected. Clearing the
        browser's storage clears the log, so export a report when you need a
        durable record.
      </P>
    </div>
  );
}
