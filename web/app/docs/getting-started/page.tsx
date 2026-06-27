import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/getting-started" },
  title: { absolute: "Getting Started | ThesisLock Docs" },
  description:
    "What ThesisLock is, how anchoring works, and how to anchor your first document in under a minute.",
};

export default function GettingStarted() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Getting Started</h1>
      <Lead>
        ThesisLock is a proof-of-existence service for documents. You prove a file existed at a
        point in time without ever revealing the file itself.
      </Lead>

      <H2>What is ThesisLock</H2>
      <P>
        ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, which settles on
        Bitcoin. The hash is a one-way fingerprint: it identifies the file uniquely, but the file
        cannot be reconstructed from it. Once a hash is anchored, anyone can confirm when it was
        recorded, by which wallet, and what label was attached, all without access to the original
        document.
      </P>

      <H2>How it works</H2>
      <P>The lifecycle of an anchor has three steps:</P>
      <List
        items={[
          <>
            <strong>Hash.</strong> Your browser computes the SHA-256 digest of the file locally. The
            file never leaves your device; only its fingerprint is used.
          </>,
          <>
            <strong>Anchor.</strong> You sign a Stacks transaction with your wallet that writes the
            hash, an optional label, and the current block heights to a Clarity contract on chain.
          </>,
          <>
            <strong>Verify.</strong> Anyone can later re-hash a file and check it against the chain,
            or visit a verification URL, to confirm the anchor and its timestamp.
          </>,
        ]}
      />

      <H2>Prerequisites</H2>
      <P>
        To anchor a document you need a Stacks wallet and a small amount of STX to cover the
        transaction fee. ThesisLock supports the major wallets through Stacks Connect:
      </P>
      <List
        items={[
          <>
            <a
              href="https://leather.io"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Leather
            </a>
          </>,
          <>
            <a
              href="https://www.xverse.app"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Xverse
            </a>
          </>,
          <>
            <a
              href="https://asigna.io"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Asigna
            </a>{" "}
            (multisig)
          </>,
        ]}
      />
      <P>
        Verifying an existing anchor needs no wallet at all. It is a read-only lookup against the
        public Hiro API.
      </P>

      <H2>Anchor your first document in 60 seconds</H2>
      <List
        items={[
          <>
            Open the{" "}
            <Link href="/anchor" className="underline hover:text-foreground">
              anchor page
            </Link>{" "}
            and connect your wallet.
          </>,
          <>Drop a file onto the page, or pick one. It is hashed in place.</>,
          <>Add an optional label (up to 64 ASCII characters) to describe it.</>,
          <>
            Sign the transaction in your wallet. ThesisLock polls for confirmation and shows a toast
            when the anchor lands on chain.
          </>,
          <>
            Share the verification link, which has the form{" "}
            <code className="font-mono text-sm">/v/&lt;hash&gt;</code>, so anyone can confirm the
            anchor.
          </>,
        ]}
      />

      <H2>Verify on chain</H2>
      <P>
        You do not need the frontend to verify. Any hash can be checked directly against the Hiro
        mainnet API, or with the SDK, CLI, or GitHub Action. The quickest manual check is a
        read-only contract call:
      </P>
      <CodeBlock language="bash">{`HASH=0000000000000000000000000000000000000000000000000000000000000000

curl -sX POST \\
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock/is-anchored \\
  -H 'Content-Type: application/json' \\
  --data "{\\"sender\\":\\"SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM\\",\\"arguments\\":[\\"0x0200000020\${HASH}\\"]}"`}</CodeBlock>
      <P>
        See the{" "}
        <Link href="/docs/contracts" className="underline hover:text-foreground">
          Contracts
        </Link>{" "}
        and{" "}
        <Link href="/docs/api" className="underline hover:text-foreground">
          API Reference
        </Link>{" "}
        pages for the full set of read paths.
      </P>
    </div>
  );
}
