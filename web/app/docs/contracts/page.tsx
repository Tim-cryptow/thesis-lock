import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, Code, H2, H3, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/contracts" },
  title: { absolute: "Contracts | ThesisLock Docs" },
  description:
    "The five Clarity contracts behind ThesisLock, their mainnet addresses, function signatures, and direct Hiro API read calls.",
};

const DEPLOYER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

export default function Contracts() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Contracts</h1>
      <Lead>
        ThesisLock is five Clarity 3 contracts deployed to Stacks mainnet under
        the same principal. Each one stores anchors in a different shape; all of
        them are public and readable without a wallet.
      </Lead>

      <H2>Deployer</H2>
      <P>
        Every contract lives at the deployer principal{" "}
        <Code>{DEPLOYER}</Code>. A contract identifier is the principal followed
        by the contract name, for example{" "}
        <Code>{DEPLOYER}.thesislock</Code>.
      </P>

      <H2>The five contracts</H2>
      <Table
        headers={["Contract", "Purpose"]}
        rows={[
          [
            <Code key="c">thesislock</Code>,
            "Original single-hash anchor. Stores one immutable record per hash: who anchored it, the Stacks and burn block heights, and an optional label.",
          ],
          [
            <Code key="c">thesislock-batch</Code>,
            "Anchors up to ten hashes in one transaction, keyed by hash and owner. Duplicate hashes for the same owner are silently skipped.",
          ],
          [
            <Code key="c">thesislock-registry</Code>,
            "Per-principal append-only index of anchors. Powers the My Anchors page and recent-activity reads.",
          ],
          [
            <Code key="c">thesislock-proof</Code>,
            "SIP-009 NFT issuing soulbound proof tokens. Minting anchors a hash and mints a non-transferable token; transfers always fail.",
          ],
          [
            <Code key="c">thesislock-groups</Code>,
            "Named groups for collaborative anchoring. An admin manages members; any member can append to a shared, on-chain history.",
          ],
        ]}
      />

      <H2>Function signatures</H2>
      <P>
        Public functions write state and must be signed by a wallet. Read-only
        functions take no gas and can be called against the Hiro API directly
        (see <a href="#direct-api-reads" className="underline hover:text-foreground">Direct API reads</a>{" "}
        below).
      </P>

      <H3>thesislock</H3>
      <CodeBlock language="clarity">{`;; public
(anchor-document (hash (buff 32)) (label (string-ascii 64)))

;; read-only
(get-anchor   (hash (buff 32)))   ;; (optional { anchored-by, stacks-block, burn-block, label })
(is-anchored  (hash (buff 32)))   ;; bool`}</CodeBlock>

      <H3>thesislock-batch</H3>
      <CodeBlock language="clarity">{`;; public
(anchor-batch (entries (list 10 { hash: (buff 32), label: (string-ascii 64) })))

;; read-only
(get-batch-anchor (hash (buff 32)) (owner principal))  ;; (optional { label, stacks-block, burn-block, batch-id })
(get-batch-count)                                      ;; uint`}</CodeBlock>

      <H3>thesislock-registry</H3>
      <CodeBlock language="clarity">{`;; public
(register-anchor (hash (buff 32)) (label (string-ascii 64)))

;; read-only
(get-anchor-count   (owner principal))               ;; uint
(get-anchor-at      (owner principal) (index uint))  ;; (optional { hash, label, stacks-block })
(get-recent-anchors (owner principal))               ;; (list ...) newest first`}</CodeBlock>

      <H3>thesislock-proof</H3>
      <CodeBlock language="clarity">{`;; public
(mint-proof (hash (buff 32)) (label (string-ascii 64)))
(transfer   (token-id uint) (sender principal) (recipient principal))  ;; always (err u401)

;; read-only (SIP-009)
(get-last-token-id)                       ;; (ok uint)
(get-token-uri        (token-id uint))    ;; (ok (optional ...))
(get-owner            (token-id uint))    ;; (ok (optional principal))
(get-proof            (token-id uint))    ;; (optional { hash, label, stacks-block })
(get-token-id-by-hash (hash (buff 32)))   ;; (optional uint)
(get-proof-by-hash    (hash (buff 32)))   ;; (optional { ... })`}</CodeBlock>

      <H3>thesislock-groups</H3>
      <CodeBlock language="clarity">{`;; public
(create-group   (name (string-ascii 64)))
(add-member     (group-id uint) (member principal))
(remove-member  (group-id uint) (member principal))
(anchor-to-group (group-id uint) (hash (buff 32)) (label (string-ascii 64)))

;; read-only
(get-group              (group-id uint))
(is-member              (group-id uint) (who principal))   ;; bool
(get-group-anchor-count (group-id uint))                   ;; uint
(get-group-anchor-at    (group-id uint) (index uint))
(get-recent-group-anchors (group-id uint))`}</CodeBlock>
      <P>
        Non-admin calls to <Code>add-member</Code> or{" "}
        <Code>remove-member</Code> fail with <Code>u403</Code>. A duplicate
        proof hash fails with <Code>u409</Code>.
      </P>

      <H2>Direct API reads</H2>
      <P>
        Read-only functions can be called over HTTP against the public Hiro
        mainnet API at <Code>https://api.mainnet.hiro.so</Code>. Arguments are
        serialized Clarity values. A 32-byte hash is encoded as a{" "}
        <Code>(buff 32)</Code> by prefixing the hex with{" "}
        <Code>0x0200000020</Code> (type byte <Code>02</Code>, big-endian length{" "}
        <Code>00000020</Code>).
      </P>

      <H3>is-anchored: a boolean check</H3>
      <P>
        The quickest lookup. Returns <Code>0x03</Code> for true and{" "}
        <Code>0x04</Code> for false.
      </P>
      <CodeBlock language="bash">{`HASH=0000000000000000000000000000000000000000000000000000000000000000

curl -sX POST \\
  https://api.mainnet.hiro.so/v2/contracts/call-read/${DEPLOYER}/thesislock/is-anchored \\
  -H 'Content-Type: application/json' \\
  --data "{\\"sender\\":\\"${DEPLOYER}\\",\\"arguments\\":[\\"0x0200000020\${HASH}\\"]}"`}</CodeBlock>

      <H3>get-anchor: the full record</H3>
      <P>
        Returns a serialized Clarity optional. <Code>0x09</Code> means{" "}
        <Code>none</Code> (never anchored); a payload beginning <Code>0x0a0c</Code>{" "}
        is <Code>(some (tuple ...))</Code>.
      </P>
      <CodeBlock language="bash">{`curl -sX POST \\
  https://api.mainnet.hiro.so/v2/contracts/call-read/${DEPLOYER}/thesislock/get-anchor \\
  -H 'Content-Type: application/json' \\
  --data "{\\"sender\\":\\"${DEPLOYER}\\",\\"arguments\\":[\\"0x0200000020\${HASH}\\"]}"`}</CodeBlock>
      <P>Decode a <Code>some</Code> payload into JSON with @stacks/transactions:</P>
      <CodeBlock language="bash">{`node -e '
const { deserializeCV, cvToJSON } = require("@stacks/transactions");
const hex = "0a0c0000000..."; // strip 0x, paste from API response
console.log(JSON.stringify(cvToJSON(deserializeCV(hex)), null, 2));
'`}</CodeBlock>

      <H3>get-batch-anchor: serialize the owner too</H3>
      <P>
        Batch anchors are keyed by both hash and owner, so the principal is a
        second serialized argument. Let @stacks/transactions encode it:
      </P>
      <CodeBlock language="bash">{`HASH=0000000000000000000000000000000000000000000000000000000000000000
OWNER=${DEPLOYER}

OWNER_HEX=$(node -e '
const { principalCV, serializeCV } = require("@stacks/transactions");
process.stdout.write("0x" + serializeCV(principalCV(process.argv[1])));
' "$OWNER")

curl -sX POST \\
  https://api.mainnet.hiro.so/v2/contracts/call-read/${DEPLOYER}/thesislock-batch/get-batch-anchor \\
  -H 'Content-Type: application/json' \\
  --data "{\\"sender\\":\\"\${OWNER}\\",\\"arguments\\":[\\"0x0200000020\${HASH}\\",\\"\${OWNER_HEX}\\"]}"`}</CodeBlock>

      <H3>get-anchor-count: a single principal argument</H3>
      <CodeBlock language="bash">{`OWNER=${DEPLOYER}
OWNER_HEX=$(node -e '
const { principalCV, serializeCV } = require("@stacks/transactions");
process.stdout.write("0x" + serializeCV(principalCV(process.argv[1])));
' "$OWNER")

curl -sX POST \\
  https://api.mainnet.hiro.so/v2/contracts/call-read/${DEPLOYER}/thesislock-registry/get-anchor-count \\
  -H 'Content-Type: application/json' \\
  --data "{\\"sender\\":\\"\${OWNER}\\",\\"arguments\\":[\\"\${OWNER_HEX}\\"]}"`}</CodeBlock>

      <H2>Prefer not to serialize by hand?</H2>
      <List
        items={[
          <>
            The{" "}
            <Link href="/docs/api" className="underline hover:text-foreground">
              REST API
            </Link>{" "}
            wraps these reads and returns plain JSON, no Clarity encoding
            required.
          </>,
          <>
            The{" "}
            <Link href="/docs/sdk" className="underline hover:text-foreground">
              TypeScript SDK
            </Link>{" "}
            handles serialization and decoding for you.
          </>,
          <>
            The{" "}
            <Link href="/docs/cli" className="underline hover:text-foreground">
              CLI
            </Link>{" "}
            verifies from the terminal and exits non-zero on a miss.
          </>,
        ]}
      />
    </div>
  );
}
