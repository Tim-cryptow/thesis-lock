import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/reports" },
  title: { absolute: "Verification Reports | ThesisLock Docs" },
  description:
    "Generate formal, multi-document verification reports proving a set of hashes were anchored on Stacks, exportable as HTML, JSON, or CSV.",
};

export default function Reports() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Verification Reports</h1>
      <Lead>
        A verification report is a formal, multi-document audit artifact: it proves that a set of
        documents were anchored on the Stacks blockchain at the time of generation, with a table of
        contents, summary statistics, and per-document verification details. Build one at{" "}
        <Link href="/report" className="underline hover:text-foreground">
          /report
        </Link>
        .
      </Lead>

      <H2>Report types</H2>
      <P>
        The single-document{" "}
        <Link href="/docs/web-app" className="underline hover:text-foreground">
          certificate
        </Link>{" "}
        attests to one anchor. A verification report covers many documents at once and is suited to
        audits, submissions, and compliance records. It is offered in three formats:
      </P>
      <Table
        headers={["Format", "Use case"]}
        rows={[
          ["HTML", "A self-contained, printable document for sharing or archiving."],
          ["JSON", "Structured data for programmatic checks and pipelines."],
          ["CSV", "A flat table for spreadsheets and record keeping."],
        ]}
      />

      <H2>Building a report</H2>
      <List
        items={[
          "Drop files to hash them in your browser (the files never leave your device), paste hashes one per line, or import anchors from your connected wallet.",
          "Each hash is checked across every contract: single anchors, batch anchors, the registry, group anchors, and proof NFTs.",
          "The report shows how many of the documents are verified, a breakdown by anchor source, and full metadata for each entry, with a verification URL anyone can re-check.",
        ]}
      />
      <P>
        Reports are also reachable from the{" "}
        <Link href="/anchors" className="underline hover:text-foreground">
          My Anchors
        </Link>
        ,{" "}
        <Link href="/verify-bulk" className="underline hover:text-foreground">
          bulk verify
        </Link>
        , group, and{" "}
        <Link href="/dashboard" className="underline hover:text-foreground">
          dashboard
        </Link>{" "}
        pages, which hand off their hashes to the builder.
      </P>

      <H2>API</H2>
      <P>
        Generate a report server-side by POSTing a list of hashes. Add <Code>?format=html</Code> or{" "}
        <Code>?format=csv</Code> to receive the rendered document instead of JSON.
      </P>
      <CodeBlock language="bash">{`curl -s -X POST "https://thesis-lock.vercel.app/api/report" \\
  -H "Content-Type: application/json" \\
  -d '{"hashes":[{"hash":"9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06","filename":"thesis.pdf"}]}' | jq`}</CodeBlock>
      <P>
        Every verification is independently reproducible against the public Hiro mainnet API, so a
        report can be re-checked without trusting ThesisLock.
      </P>
    </div>
  );
}
