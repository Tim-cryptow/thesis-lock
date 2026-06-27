import type { Metadata } from "next";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/error-handling" },
  title: { absolute: "Error Handling | ThesisLock Docs" },
  description:
    "How ThesisLock handles missing routes, invalid parameters, runtime errors, rate limits, and offline use with consistent, helpful pages.",
};

export default function ErrorHandlingDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Error Handling</h1>
      <Lead>
        Bad links, invalid parameters, a busy blockchain API, or no connection at all: each one gets
        a clear, on-brand page that explains what happened and points the way back, in both light
        and dark themes.
      </Lead>

      <H2>Pages that do not exist</H2>
      <P>
        A global 404 page handles any unmatched URL with an inline hash search and quick links to
        the main flows. The dynamic routes validate their parameter on the server before rendering
        and call <Code>notFound()</Code> when it is malformed, so a bad link lands on a specific
        message instead of a broken view:
      </P>
      <List
        items={[
          <>
            <Code>/v/[hash]</Code> checks the hash is 64 hexadecimal characters.
          </>,
          <>
            <Code>/u/[address]</Code> checks the address is a valid Stacks principal.
          </>,
          <>
            <Code>/groups/[id]</Code> checks the id is a number.
          </>,
        ]}
      />
      <P>
        Next.js automatically adds <Code>noindex</Code> for pages that return a 404, so these never
        show up in search results.
      </P>

      <H2>When something breaks</H2>
      <P>
        Every route segment that fetches on-chain data has an <Code>error.tsx</Code> boundary. It
        shows a retry button wired to <Code>unstable_retry()</Code>, which re-runs the failed
        segment, plus a contextual link back. The global error page adds a link to report the issue,
        and the original error message is shown only in development. When the failure looks like a
        rate limit, a dedicated view counts down and retries on its own.
      </P>

      <H2>Offline and maintenance</H2>
      <P>
        The service worker pre-caches an <Code>/offline</Code> page and serves it for navigations
        made without a connection. It explains that file hashing still runs locally while anchoring
        and verification need the network. A standalone <Code>/maintenance</Code> page is available
        for planned downtime and reassures visitors that anchored documents stay safe on the
        blockchain.
      </P>

      <H2>For contributors</H2>
      <P>
        A single <Code>ErrorPage</Code> component backs every one of these pages, so they stay
        consistent. It takes a code, title, description, optional quick-link suggestions, and an
        optional inline search box:
      </P>
      <CodeBlock language="tsx">{`import ErrorPage from "@/app/components/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="Group not found"
      description="This group may not exist or may have been created on a different network."
      suggestions={[{ label: "Browse all groups", href: "/groups" }]}
    />
  );
}`}</CodeBlock>
    </div>
  );
}
