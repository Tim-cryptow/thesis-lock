import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "System Status | ThesisLock Docs" },
  description:
    "ThesisLock's public status page: how contract, API, and dependency health is measured, how uptime and incidents are tracked, and the status JSON API and badge.",
};

export default function StatusDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">System Status</h1>
      <Lead>
        The{" "}
        <Link href="/status" className="underline hover:text-foreground">
          status page
        </Link>{" "}
        shows the live health of every part of the protocol: the five Clarity
        contracts, the public API endpoints, and the upstream Hiro and Stacks
        dependencies. Checks run in your browser and refresh automatically, with
        a server-side snapshot also available as JSON and as an embeddable badge.
      </Lead>

      <H2>What is monitored</H2>
      <List
        items={[
          <>
            <strong>Smart contracts</strong>: each of the five contracts
            (thesislock, thesislock-batch, thesislock-registry, thesislock-proof,
            and thesislock-groups) is checked by fetching its on-chain source
            from the Hiro node RPC.
          </>,
          <>
            <strong>API endpoints</strong>: the health, verify, search, stats,
            and badge endpoints are probed for a successful response.
          </>,
          <>
            <strong>Dependencies</strong>: the Hiro Stacks API and the Stacks
            network node are pinged to surface upstream problems separately from
            our own.
          </>,
        ]}
      />

      <H2>Status levels</H2>
      <P>
        Each service is classified from a single timed request. A fast success is{" "}
        <Code>operational</Code>, a slow success is <Code>degraded</Code>, and a
        timeout, network error, or non-2xx response is <Code>down</Code>. The
        banner at the top rolls these up into all systems operational, a partial
        outage, or a major outage (a downed dependency or at least half the
        services down).
      </P>

      <H2>Uptime and history</H2>
      <P>
        The live view refreshes every minute. Underneath it, a history point is
        sampled at most once every five minutes and kept for 24 hours in your
        browser, which drives the per-service uptime percentage and the bar of
        recent checks. Because history is stored locally, it is private to your
        device; the server keeps only a best-effort recent snapshot.
      </P>

      <H2>Incidents</H2>
      <P>
        When monitoring detects a service is down, it opens an incident
        automatically and resolves it once the service recovers, with a severity
        derived from what failed. Incidents can also be tracked by hand and move
        through the usual stages: investigating, identified, monitoring, and
        resolved. The timeline shows active incidents first, then resolved ones
        from the last seven days.
      </P>

      <H2>Status API</H2>
      <P>
        A server-side snapshot of all services is available as JSON, with a short
        edge cache so it is cheap to poll:
      </P>
      <CodeBlock language="bash">{`curl https://thesis-lock.vercel.app/api/status`}</CodeBlock>
      <List
        items={[
          <>
            <Code>GET /api/status</Code> returns{" "}
            <Code>{`{ overall, services, timestamp }`}</Code>.
          </>,
          <>
            <Code>GET /api/status/history</Code> returns the recent per-service
            history this server instance has observed.
          </>,
          <>
            <Code>GET /api/status/badge</Code> returns an SVG badge of the overall
            status for embedding.
          </>,
        ]}
      />

      <H2>Status badge</H2>
      <P>
        Embed the live status badge in any README or page the same way as the
        verification badge:
      </P>
      <CodeBlock language="markdown">{`![Status](https://thesis-lock.vercel.app/api/status/badge)`}</CodeBlock>
    </div>
  );
}
