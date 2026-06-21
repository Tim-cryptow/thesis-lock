import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Feeds | ThesisLock Docs" },
  description:
    "Subscribe to ThesisLock protocol events with RSS 2.0, Atom 1.0, and JSON Feed endpoints, filterable by contract and wallet.",
};

export default function FeedsDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Feeds</h1>
      <Lead>
        ThesisLock publishes its on-chain event stream as standard feeds so you
        can follow new anchors, batches, group anchors, and proof mints in any
        reader, or pipe them into tools like Slack, Zapier, or IFTTT.
      </Lead>

      <H2>Endpoints</H2>
      <List
        items={[
          <>
            <Code>GET /api/feed/rss</Code>: RSS 2.0 (
            <Code>application/rss+xml</Code>).
          </>,
          <>
            <Code>GET /api/feed/atom</Code>: Atom 1.0 (
            <Code>application/atom+xml</Code>).
          </>,
          <>
            <Code>GET /api/feed/json</Code>: JSON Feed 1.1 (
            <Code>application/feed+json</Code>).
          </>,
        ]}
      />
      <CodeBlock language="bash">{`curl https://thesis-lock.vercel.app/api/feed/rss`}</CodeBlock>

      <H2>Filtering</H2>
      <P>All three endpoints accept the same query parameters:</P>
      <List
        items={[
          <>
            <Code>?contract=&lt;name&gt;</Code>: only events from one contract
            (for example <Code>batch</Code>, <Code>groups</Code>,{" "}
            <Code>proof</Code>, or the full name like{" "}
            <Code>thesislock-batch</Code>).
          </>,
          <>
            <Code>?address=&lt;principal&gt;</Code>: only events attributed to one
            wallet.
          </>,
          <>
            <Code>?limit=&lt;n&gt;</Code>: how many recent events to include (up
            to 100, default 50).
          </>,
        ]}
      />
      <CodeBlock language="bash">{`curl "https://thesis-lock.vercel.app/api/feed/atom?contract=groups&limit=20"`}</CodeBlock>

      <H2>Autodiscovery</H2>
      <P>
        Every page advertises the RSS and Atom feeds with{" "}
        <Code>{`<link rel="alternate">`}</Code> tags in the document head, so feed
        readers can find them from the site root automatically.
      </P>

      <H2>Programmatic alerts</H2>
      <P>
        For push-style integrations rather than polling, see the{" "}
        <Link href="/docs/webhooks" className="underline hover:text-foreground">
          webhooks
        </Link>{" "}
        documentation, which describes the signed event payload format.
      </P>
    </div>
  );
}
