import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Webhooks | ThesisLock Docs" },
  description:
    "The ThesisLock webhook format: event types, the signed JSON payload, and HMAC-SHA256 signature verification in Node.js and Python.",
};

const PAYLOAD = `{
  "event": "anchor.created",
  "data": {
    "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "label": "Thesis final draft",
    "owner": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
    "txId": "0x9f1e...eeff0",
    "stacksBlock": 168420
  },
  "timestamp": "2026-06-21T15:00:00.000Z"
}`;

const NODE = `import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret) {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected),
  );
}`;

const PYTHON = `import hmac, hashlib

def verify(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected)`;

export default function WebhooksDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Webhooks</h1>
      <Lead>
        Webhooks push protocol events to your endpoint as signed JSON. Manage
        subscriptions and send test payloads from the{" "}
        <Link href="/developers#webhooks" className="underline hover:text-foreground">
          developer portal
        </Link>
        . Like the rest of ThesisLock there is no server of our own, so this
        documents the format and signing scheme you wire into your own delivery
        service, using the same events that drive the feeds and audit log.
      </Lead>

      <H2>Event types</H2>
      <List
        items={[
          <>
            <Code>anchor.created</Code>: a single document was anchored.
          </>,
          <>
            <Code>batch.created</Code>: a batch of documents was anchored.
          </>,
          <>
            <Code>group.anchor</Code>: a document was anchored to a group.
          </>,
          <>
            <Code>proof.minted</Code>: a proof NFT was minted.
          </>,
          <>
            <Code>group.created</Code>: a new group was created.
          </>,
          <>
            <Code>group.member_added</Code>: a member was added to a group.
          </>,
        ]}
      />

      <H2>Payload</H2>
      <P>
        Each delivery is an HTTP POST whose body is a JSON object of{" "}
        <Code>{`{ event, data, timestamp }`}</Code>:
      </P>
      <CodeBlock language="json">{PAYLOAD}</CodeBlock>

      <H2>Signature</H2>
      <P>
        The request carries an <Code>X-ThesisLock-Signature</Code> header of the
        form <Code>sha256=&lt;hex&gt;</Code>, an HMAC-SHA256 of the raw request
        body computed with your subscription{"'"}s signing secret. The secret is
        shown once when you create the subscription. Verify it before trusting a
        payload:
      </P>
      <CodeBlock language="javascript">{NODE}</CodeBlock>
      <CodeBlock language="python">{PYTHON}</CodeBlock>

      <H2>Retries</H2>
      <P>
        Delivery and retries are implemented by your integration. A common policy
        is to retry on any non-2xx response with exponential backoff (for example
        one minute, five minutes, thirty minutes) for a few attempts, then pause
        the subscription. The developer portal tracks a per-subscription fail
        count for visibility.
      </P>

      <H2>Testing</H2>
      <P>
        The portal{"'"}s webhook tester sends a sample payload to your endpoint
        and shows the response. If your endpoint does not allow cross-origin
        requests from the browser, it falls back to a ready-to-run{" "}
        <Code>curl</Code> command.
      </P>
    </div>
  );
}
