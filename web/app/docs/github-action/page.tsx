import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/github-action" },
  title: { absolute: "GitHub Action | ThesisLock Docs" },
  description:
    "Gate any CI pipeline on a document being anchored on Stacks, with the ThesisLock verify action: inputs, outputs, and example workflows.",
};

export default function GithubAction() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">GitHub Action</h1>
      <Lead>
        The reusable verify action confirms a document hash is anchored on
        Stacks from inside any CI pipeline. It reads the public Hiro mainnet API
        directly and needs no wallet, secret, or signing key.
      </Lead>
      <P>
        A typical use: a research lab anchors a dataset hash once, then confirms
        on every release that the artifact is still backed by an on-chain proof.
      </P>

      <H2>Usage</H2>
      <P>Hash a file in your repo and verify it:</P>
      <CodeBlock language="yaml">{`- name: Verify dataset hash
  uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    fail-on-unverified: "true"`}</CodeBlock>
      <P>Or verify a hash you already know:</P>
      <CodeBlock language="yaml">{`- uses: Tim-cryptow/thesis-lock/action@main
  with:
    hash: "abc123..."`}</CodeBlock>
      <P>Verify a batch anchor by passing the anchoring wallet:</P>
      <CodeBlock language="yaml">{`- uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    owner: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM"`}</CodeBlock>

      <H2>Inputs</H2>
      <Table
        headers={["Input", "Description", "Required", "Default"]}
        rows={[
          [<Code key="i">hash</Code>, "SHA-256 hash to verify (64 hex chars).", "No", ""],
          [<Code key="i">file</Code>, "Path to a file to hash and verify.", "No", ""],
          [
            <Code key="i">owner</Code>,
            "Stacks principal for batch anchor lookup.",
            "No",
            "",
          ],
          [
            <Code key="i">fail-on-unverified</Code>,
            "Fail the step if the hash is not verified.",
            "No",
            <Code key="d">true</Code>,
          ],
        ]}
      />
      <P>
        Provide either <Code>hash</Code> or <Code>file</Code>. When{" "}
        <Code>file</Code> is set it takes precedence and the action computes the
        file's SHA-256 digest locally.
      </P>

      <H2>Outputs</H2>
      <Table
        headers={["Output", "Description"]}
        rows={[
          [
            <Code key="o">verified</Code>,
            "Whether the hash is verified on-chain (true/false).",
          ],
          [
            <Code key="o">source</Code>,
            "Anchor source (single, batch, proof, group).",
          ],
          [<Code key="o">block</Code>, "Stacks block number where the hash was anchored."],
          [<Code key="o">label</Code>, "Label attached to the anchor."],
        ]}
      />
      <P>Read the outputs in a later step:</P>
      <CodeBlock language="yaml">{`- id: verify
  uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    fail-on-unverified: "false"
- run: |
    echo "verified: \${{ steps.verify.outputs.verified }}"
    echo "source:   \${{ steps.verify.outputs.source }}"
    echo "block:    \${{ steps.verify.outputs.block }}"
    echo "label:    \${{ steps.verify.outputs.label }}"`}</CodeBlock>

      <H2>How it works</H2>
      <List
        items={[
          <>
            If <Code>file</Code> is supplied, the action reads it and computes a
            SHA-256 digest. The file never leaves the runner.
          </>,
          <>
            It queries the public Hiro mainnet API with read-only contract
            calls: <Code>thesislock.get-anchor</Code> for single anchors,{" "}
            <Code>thesislock-batch.get-batch-anchor</Code> when an owner is
            supplied, and <Code>thesislock-proof.get-token-id-by-hash</Code> then{" "}
            <Code>get-proof</Code> for proof NFTs.
          </>,
          <>
            The first contract that holds the hash determines{" "}
            <Code>source</Code>, <Code>block</Code>, and <Code>label</Code>. If
            none do, the hash is not verified.
          </>,
          <>
            When <Code>fail-on-unverified</Code> is true (the default), an
            unverified hash fails the step so a broken proof can gate a release.
          </>,
        ]}
      />
      <P>
        Prefer a plain command-line step? The{" "}
        <Link href="/docs/cli" className="underline hover:text-foreground">
          CLI
        </Link>{" "}
        offers the same verification with <Code>thesislock hash --verify</Code>.
      </P>
    </div>
  );
}
