import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, H3, Lead, P, Table } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/cli" },
  title: { absolute: "CLI Guide | ThesisLock Docs" },
  description:
    "Verify, hash, search, batch-hash, and check ThesisLock anchors from the terminal or a CI pipeline with the thesislock-cli package, including JSON and quiet output and shell completions.",
};

export default function CliGuide() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">CLI Guide</h1>
      <Lead>
        The <Code>thesislock-cli</Code> package verifies anchors from the
        terminal or a CI pipeline, with no browser or wallet required. It hashes
        files locally and compares only the SHA-256 digest against on-chain
        data; files are never uploaded.
      </Lead>

      <P>
        Every command also accepts <Code>--json</Code> for machine-readable
        output and <Code>--quiet</Code> for a single essential value, which makes
        the CLI easy to script.
      </P>

      <H2>Installation</H2>
      <P>
        The CLI depends on the sibling <Code>sdk/</Code> package, so build that
        first when working from the monorepo:
      </P>
      <CodeBlock language="bash">{`cd sdk && npm install && npm run build
cd ../cli && npm install && npm run build
node dist/bin/thesislock.js --help`}</CodeBlock>
      <P>
        Link the built package to put the <Code>thesislock</Code> command on
        your PATH. Once published to the registry, a global install also works:
      </P>
      <CodeBlock language="bash">{`cd cli && npm link
# or, after publish:
npm install -g thesislock-cli`}</CodeBlock>

      <H2>verify</H2>
      <P>
        Check whether a hash is anchored in any contract (single, batch,
        registry, proof NFT, or group). Exits <Code>0</Code> when anchored and{" "}
        <Code>1</Code> when not, so it works directly as a CI gate.
      </P>
      <CodeBlock language="bash">{`thesislock verify 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06`}</CodeBlock>
      <CodeBlock language="text">{`Verified
  Source:    thesislock (single anchor)
  Label:     project
  Owner:     SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
  Block:     8104143
  Timestamp: 2026-05-27T13:13:00.000Z`}</CodeBlock>
      <P>
        Batch owners are discovered automatically from registry events, and an
        explicit owner can be supplied with <Code>--owner</Code>:
      </P>
      <CodeBlock language="bash">{`thesislock verify <hash> --owner SP000...`}</CodeBlock>
      <P>
        Use <Code>--quiet</Code> for a bare <Code>true</Code> or{" "}
        <Code>false</Code>, or <Code>--json</Code> for a structured result.
      </P>
      <CodeBlock language="bash">{`thesislock verify <hash> --quiet
thesislock verify <hash> --json`}</CodeBlock>

      <H2>hash</H2>
      <P>
        Compute the SHA-256 digest of one or more files. For each file the CLI
        prints the filename, size, and 64-character hex hash.
      </P>
      <CodeBlock language="bash">{`thesislock hash thesis.pdf
thesislock hash chapter1.pdf chapter2.pdf chapter3.pdf`}</CodeBlock>
      <P>
        Add <Code>--verify</Code> to check each digest against the chain in the
        same step. The exit code is <Code>1</Code> if any file is missing an
        anchor.
      </P>
      <CodeBlock language="bash">{`thesislock hash thesis.pdf --verify`}</CodeBlock>

      <H2>status</H2>
      <P>
        Protocol overview: contract count and addresses, the latest Stacks
        block, and Hiro API health. Pass a principal to see how many anchors a
        wallet has registered.
      </P>
      <CodeBlock language="bash">{`thesislock status
thesislock status SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX`}</CodeBlock>

      <H2>search</H2>
      <P>
        Search anchors across all contracts. The query type is auto-detected:
        64-hex searches by hash, a Stacks address by wallet, and anything else
        as a label substring. Results print as a table; add <Code>--json</Code>{" "}
        for machine-readable output, and <Code>--limit</Code> to cap the rows.
      </P>
      <CodeBlock language="bash">{`thesislock search "thesis draft"
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
thesislock search 9afe6f57...585d06 --json
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX --limit 5`}</CodeBlock>

      <H2>batch</H2>
      <P>
        Hash every file in a directory. For each file the CLI prints the path
        relative to the scanned directory, size, and hash, then a summary line.
        Add <Code>--recursive</Code> to descend into subdirectories,{" "}
        <Code>--exclude</Code> for comma-separated glob patterns, and{" "}
        <Code>--verify</Code> to check each hash on chain.
      </P>
      <CodeBlock language="bash">{`thesislock batch ./papers
thesislock batch ./papers --recursive --exclude "*.log,node_modules"
thesislock batch ./papers --verify --json`}</CodeBlock>

      <H2>Scripting</H2>
      <P>
        <Code>--quiet</Code> emits a single value per command, ideal for shell
        substitution, and <Code>--json</Code> pairs well with <Code>jq</Code>.
      </P>
      <CodeBlock language="bash">{`HASH=$(thesislock hash thesis.pdf --quiet)
thesislock batch ./papers --verify --json | jq -r '.[] | select(.anchored == false) | .path'`}</CodeBlock>

      <H2>Shell completion</H2>
      <P>
        Completion scripts for <Code>bash</Code> and <Code>zsh</Code> ship in the{" "}
        <Code>completions/</Code> directory of the CLI package and complete every
        command and flag.
      </P>
      <CodeBlock language="bash">{`# bash: from your ~/.bashrc
source /path/to/thesislock-cli/completions/thesislock.bash

# zsh: place the script on your fpath, then reload completions
mkdir -p ~/.zsh/completions
cp completions/thesislock.zsh ~/.zsh/completions/_thesislock
# in ~/.zshrc, before compinit:
#   fpath=(~/.zsh/completions $fpath)
#   autoload -U compinit && compinit`}</CodeBlock>

      <H2>Configuration</H2>
      <Table
        headers={["Environment variable", "Default", "Purpose"]}
        rows={[
          [
            <Code key="e">THESISLOCK_API_URL</Code>,
            <Code key="d">https://api.mainnet.hiro.so</Code>,
            "Base URL of the Hiro Stacks API used for all reads.",
          ],
        ]}
      />
      <CodeBlock language="bash">{`THESISLOCK_API_URL=https://my-hiro-proxy.example.com thesislock status`}</CodeBlock>

      <H2>CI integration</H2>
      <P>
        Use <Code>verify</Code> or <Code>hash --verify</Code> as a step that
        fails when a document is not anchored:
      </P>
      <CodeBlock language="yaml">{`jobs:
  verify-anchor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install ThesisLock CLI
        run: npm install -g thesislock-cli
      - name: Verify the published whitepaper is anchored
        run: thesislock hash docs/whitepaper.pdf --verify`}</CodeBlock>
      <P>
        For a packaged step with typed inputs and outputs, the{" "}
        <Link
          href="/docs/github-action"
          className="underline hover:text-foreground"
        >
          GitHub Action
        </Link>{" "}
        wraps the same verification.
      </P>
    </div>
  );
}
