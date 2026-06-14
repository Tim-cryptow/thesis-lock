import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, H3, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "API Reference | ThesisLock Docs" },
  description:
    "The ThesisLock JSON REST API: verification, search, stats, badges, social cards, NFT metadata, webhooks, and health.",
};

const BASE = "https://thesis-lock.vercel.app";

export default function ApiReference() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">API Reference</h1>
      <Lead>
        A small JSON API wraps the Clarity reads so you can integrate
        verification without any Clarity serialization knowledge. Every endpoint
        sends <Code>Access-Control-Allow-Origin: *</Code>, so it can be called
        straight from a browser.
      </Lead>
      <P>
        Base URL: <Code>{BASE}</Code>
      </P>

      <H2>GET /api/verify/&lt;hash&gt;</H2>
      <P>
        Verify a single 64-character hex hash. Append{" "}
        <Code>?owner=&lt;principal&gt;</Code> to also check owner-keyed batch
        anchors.
      </P>
      <CodeBlock language="bash">{`curl -s ${BASE}/api/verify/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06

# Batch anchor (include the owner principal)
curl -s "${BASE}/api/verify/<hash>?owner=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM"`}</CodeBlock>

      <H2>POST /api/verify</H2>
      <P>Same lookup over POST, taking a JSON body:</P>
      <CodeBlock language="bash">{`curl -s -X POST ${BASE}/api/verify \\
  -H 'Content-Type: application/json' \\
  -d '{"hash":"9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"}'`}</CodeBlock>
      <P>
        Or upload a file and let the server compute and verify its SHA-256. The
        file is hashed in memory and never stored; the response adds the
        computed hash under <Code>computedHash</Code>.
      </P>
      <CodeBlock language="bash">{`curl -s -X POST ${BASE}/api/verify \\
  -F 'file=@thesis.pdf' \\
  -F 'owner=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM'`}</CodeBlock>

      <H3>Response schema</H3>
      <P>
        A found anchor returns <Code>verified: true</Code>:
      </P>
      <CodeBlock language="json">{`{
  "verified": true,
  "source": "single",
  "hash": "9afe6f57...",
  "label": "project",
  "owner": "SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX",
  "stacksBlock": 8104143,
  "burnBlock": 951262,
  "contract": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock",
  "verifyUrl": "${BASE}/v/9afe6f57..."
}`}</CodeBlock>
      <P>
        Batch anchors set <Code>"source": "batch"</Code> and add a{" "}
        <Code>batchId</Code>. A miss returns <Code>200</Code> with{" "}
        <Code>verified: false</Code>; an invalid hash (not 64 hex characters)
        returns <Code>400</Code>.
      </P>

      <H2>GET /api/search</H2>
      <P>
        Search anchored documents across all five contracts. Returns a JSON
        array.
      </P>
      <Table
        headers={["Parameter", "Required", "Description"]}
        rows={[
          [<Code key="q">q</Code>, "Yes", "The search term."],
          [
            <Code key="t">type</Code>,
            "No",
            <>
              <Code>auto</Code> (default), <Code>hash</Code>,{" "}
              <Code>principal</Code>, or <Code>label</Code>. Auto treats 64-hex
              as a hash, an SP/ST string as a principal, and anything else as a
              label substring.
            </>,
          ],
          [
            <Code key="o">owner</Code>,
            "No",
            "A principal to also check owner-keyed batch anchors when searching by hash.",
          ],
        ]}
      />
      <CodeBlock language="bash">{`# Auto-detect (label substring search)
curl -s "${BASE}/api/search?q=thesis"

# By hash
curl -s "${BASE}/api/search?q=9afe6f57...585d06&type=hash"

# By wallet address
curl -s "${BASE}/api/search?q=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM&type=principal"`}</CodeBlock>
      <P>
        Each result carries a <Code>source</Code> of <Code>single</Code>,{" "}
        <Code>batch</Code>, <Code>registry</Code>, <Code>proof</Code>, or{" "}
        <Code>group</Code> (group results also include a <Code>groupId</Code>).
        Responses are edge-cached for 30 seconds. A request with no{" "}
        <Code>q</Code> returns <Code>400</Code>.
      </P>

      <H2>GET /api/badge/&lt;hash&gt;</H2>
      <P>
        Returns a shields-style SVG badge. It is green with the Stacks block
        number when the hash is anchored (<Code>Verified ✓ #&lt;block&gt;</Code>)
        and gray otherwise. Embed it in a README to prove a document is on
        chain.
      </P>
      <Table
        headers={["Query", "Description"]}
        rows={[
          [<Code key="s">style=rounded</Code>, "Pill shape instead of flat corners."],
          [
            <Code key="l">label=Your+Text</Code>,
            "Custom left-hand label (default ThesisLock).",
          ],
          [<Code key="o">owner=&lt;principal&gt;</Code>, "Also check batch anchors."],
        ]}
      />
      <CodeBlock language="markdown">{`[![ThesisLock](${BASE}/api/badge/<hash>)](${BASE}/v/<hash>)`}</CodeBlock>

      <H2>GET /api/card/&lt;hash&gt;</H2>
      <P>
        Returns a larger social sharing card image for the hash, suitable as an
        Open Graph preview. Accepts <Code>?owner=&lt;principal&gt;</Code> for
        batch anchors. Visit the{" "}
        <Link href="/embed" className="underline hover:text-foreground">
          embed page
        </Link>{" "}
        to generate badge and card snippets for any hash or file.
      </P>

      <H2>GET /api/nft/&lt;id&gt;</H2>
      <P>
        Returns metadata and an SVG image for a proof NFT token id, backing the{" "}
        <Code>thesislock-proof</Code> contract's token URIs. An unknown id
        returns <Code>404</Code>; a non-integer id returns <Code>400</Code>.
      </P>

      <H2>GET /api/stats</H2>
      <P>
        Protocol-wide totals and recent activity (anchor counts, unique wallets,
        contracts deployed, first and latest anchor blocks, and a per-day
        series). Cached at the edge for five minutes.
      </P>
      <CodeBlock language="bash">{`curl -s ${BASE}/api/stats`}</CodeBlock>

      <H2>GET /api/health</H2>
      <P>Uptime probe returning the deployed contract identifiers and API version.</P>
      <CodeBlock language="bash">{`curl -s ${BASE}/api/health`}</CodeBlock>
      <CodeBlock language="json">{`{
  "status": "ok",
  "contracts": {
    "thesislock": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock",
    "batch": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock-batch",
    "registry": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock-registry"
  },
  "version": "1.0.0"
}`}</CodeBlock>

      <H2>POST /api/webhook (experimental)</H2>
      <P>
        Register an <Code>https</Code> URL to be called once when a transaction
        confirms, instead of polling. This is best-effort and in-memory:
        registrations do not survive a serverless cold start or scale-out, and
        delivery is not retried. Do not depend on it for guaranteed
        notifications.
      </P>
      <CodeBlock language="bash">{`curl -s -X POST ${BASE}/api/webhook \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/hooks/thesislock","txId":"0x<64-hex-tx-id>"}'`}</CodeBlock>
      <P>When the transaction reaches a terminal state, ThesisLock POSTs to your URL:</P>
      <CodeBlock language="json">{`{ "txId": "0x<64-hex-tx-id>", "status": "success", "blockHeight": 8104143 }`}</CodeBlock>
      <List
        items={[
          <>
            The <Code>url</Code> must be a public <Code>https</Code> endpoint.
            Loopback, private, link-local, and cloud-metadata addresses are
            rejected.
          </>,
          <>
            <Code>txId</Code> must be a 32-byte (64-character) hex transaction
            id.
          </>,
          <>
            Confirmation checks run opportunistically when the API receives
            other traffic, so delivery latency depends on usage.
          </>,
        ]}
      />
    </div>
  );
}
