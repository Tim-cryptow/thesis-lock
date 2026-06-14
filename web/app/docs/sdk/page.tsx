import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, H3, Lead, P, Table } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "SDK Guide | ThesisLock Docs" },
  description:
    "Install the thesislock-sdk TypeScript package, create a client, and call every verification, history, and proof-NFT method.",
};

export default function SdkGuide() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">SDK Guide</h1>
      <Lead>
        The <Code>thesislock-sdk</Code> package wraps the Clarity serialization
        and Hiro reads for JavaScript and TypeScript projects. It is read-only:
        it verifies existing anchors and reads history. Creating anchors needs a
        wallet and is done in the web app.
      </Lead>

      <H2>Installation</H2>
      <P>The SDK targets Node.js 18 or newer (it uses the global fetch and node:crypto).</P>
      <CodeBlock language="bash">{`npm install thesislock-sdk`}</CodeBlock>

      <H2>Quick start</H2>
      <CodeBlock language="ts">{`import { createClient } from 'thesislock-sdk';

const client = createClient();
const result = await client.verify('9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06');

if (result.verified) {
  console.log('Anchored by', result.data.anchoredBy);
  console.log('Stacks block', result.data.stacksBlock);
}`}</CodeBlock>

      <H2>Configuration</H2>
      <P>
        Both <Code>createClient(config?)</Code> and{" "}
        <Code>new ThesisLockClient(config?)</Code> accept an optional config
        object:
      </P>
      <Table
        headers={["Option", "Default", "Description"]}
        rows={[
          [
            <Code key="a">apiUrl</Code>,
            <Code key="d">https://api.mainnet.hiro.so</Code>,
            "Base URL of the Hiro Stacks API used for read-only calls.",
          ],
          [
            <Code key="c">contractAddress</Code>,
            <Code key="d">SP3QS6X01...88FNVM</Code>,
            "Principal that deployed the ThesisLock contracts.",
          ],
          [
            <Code key="n">network</Code>,
            <Code key="d">mainnet</Code>,
            "Network label, mainnet or testnet.",
          ],
        ]}
      />
      <CodeBlock language="ts">{`import { ThesisLockClient } from 'thesislock-sdk';

const client = new ThesisLockClient({
  apiUrl: 'https://api.mainnet.hiro.so',
  contractAddress: 'SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM',
});`}</CodeBlock>

      <H2>Client methods</H2>
      <P>
        All methods return Promises. A failed network call or a contract
        rejection throws an <Code>Error</Code>; a plain "not found" is not an
        error, it resolves to an unverified result or <Code>null</Code>.
      </P>

      <H3>verify(hash)</H3>
      <P>
        Looks up a single anchor in <Code>thesislock</Code>.
      </P>
      <CodeBlock language="ts">{`const result = await client.verify(hash);
// { verified: true, source: 'single', data: AnchorResult }
// or { verified: false, source: null, data: null }`}</CodeBlock>

      <H3>verifyBatch(hash, owner)</H3>
      <P>
        Looks up an owner-keyed batch anchor in <Code>thesislock-batch</Code>.
        The owner is required because batch anchors are keyed by hash and owner.
        Throws if <Code>owner</Code> is not a valid Stacks principal.
      </P>
      <CodeBlock language="ts">{`const result = await client.verifyBatch(hash, 'SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM');
// { verified: true, source: 'batch', data: BatchAnchorResult }`}</CodeBlock>

      <H3>verifyAny(hash, owner?)</H3>
      <P>
        Tries the single anchor first, then the batch anchor when an owner is
        given. Returns the first match, or an unverified result.
      </P>
      <CodeBlock language="ts">{`const result = await client.verifyAny(hash, owner);`}</CodeBlock>

      <H3>getAnchorCount(owner) and getRecentAnchors(owner)</H3>
      <P>
        Read per-principal registry data. <Code>getAnchorCount</Code> returns
        how many anchors a principal has registered;{" "}
        <Code>getRecentAnchors</Code> returns up to the ten most recent entries,
        newest first.
      </P>
      <CodeBlock language="ts">{`const count = await client.getAnchorCount(owner);
const entries = await client.getRecentAnchors(owner); // RegistryEntry[]`}</CodeBlock>

      <H3>getProof(tokenId) and getProofByHash(hash)</H3>
      <P>
        Read soulbound proof NFTs from <Code>thesislock-proof</Code>. Both
        return <Code>null</Code> when nothing matches.
      </P>
      <CodeBlock language="ts">{`const proof = await client.getProof(1);          // ProofNFT | null
const byHash = await client.getProofByHash(hash); // ProofNFT | null`}</CodeBlock>

      <H2>Utility functions</H2>
      <P>These are exported at the top level and do not need a client.</P>
      <Table
        headers={["Function", "Returns"]}
        rows={[
          [
            <Code key="f">hashString(input)</Code>,
            "Lowercase 64-char hex SHA-256 of a string's UTF-8 bytes.",
          ],
          [
            <Code key="f">hashFile(file)</Code>,
            "SHA-256 hex of a File or Buffer (async).",
          ],
          [
            <Code key="f">isValidHash(hash)</Code>,
            "True when input is 64 hex chars (an optional 0x prefix and uppercase are accepted).",
          ],
          [
            <Code key="f">serializeHash(hex)</Code>,
            "Encodes a hash as a serialized (buff 32) value, hex without 0x prefix.",
          ],
          [
            <Code key="f">truncateHash(hash, chars?)</Code>,
            "Shortens a hash to first and last chars (default 8) for display.",
          ],
        ]}
      />
      <CodeBlock language="ts">{`import { hashFile, truncateHash } from 'thesislock-sdk';
import { readFileSync } from 'node:fs';

const hash = await hashFile(readFileSync('thesis.pdf'));
console.log(truncateHash(hash, 4)); // '9afe...5d06'`}</CodeBlock>

      <H2>Types</H2>
      <P>
        <Code>AnchorResult</Code>, <Code>BatchAnchorResult</Code>,{" "}
        <Code>RegistryEntry</Code>, <Code>ProofNFT</Code>, and{" "}
        <Code>VerifyResult</Code> are exported. <Code>VerifyResult</Code> is a
        discriminated union, so checking <Code>result.verified</Code> narrows{" "}
        <Code>data</Code> with no casts.
      </P>
      <CodeBlock language="ts">{`type VerifyResult =
  | { verified: true; source: 'single'; data: AnchorResult }
  | { verified: true; source: 'batch'; data: BatchAnchorResult }
  | { verified: false; source: null; data: null };

const result = await client.verify(hash);
if (result.verified) {
  result.data.anchoredBy; // narrowed to AnchorResult
}`}</CodeBlock>
      <P>
        Prefer the terminal or a hosted endpoint? See the{" "}
        <Link href="/docs/cli" className="underline hover:text-foreground">
          CLI Guide
        </Link>{" "}
        and the{" "}
        <Link href="/docs/api" className="underline hover:text-foreground">
          REST API
        </Link>
        .
      </P>
    </div>
  );
}
