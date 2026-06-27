"use client";

import CodeBlock from "@/app/components/CodeBlock";

export type GuideTabId = "javascript" | "python" | "curl" | "github" | "cicd";

const TABS: { id: GuideTabId; label: string }[] = [
  { id: "javascript", label: "JavaScript/Node.js" },
  { id: "python", label: "Python" },
  { id: "curl", label: "cURL" },
  { id: "github", label: "GitHub Actions" },
  { id: "cicd", label: "CI/CD Generic" },
];

type Props = {
  activeTab: GuideTabId;
  onTabChange: (id: GuideTabId) => void;
};

function JavaScriptGuide() {
  return (
    <div>
      <h3 className="text-xl">JavaScript and Node.js</h3>
      <p className="mt-2 text-sm text-foreground/70">
        The <code className="font-mono">thesislock-sdk</code> package wraps the Clarity
        serialization and Hiro reads. It is read-only: it verifies existing anchors and reads
        history.
      </p>

      <CodeBlock language="bash" title="Install" code={`npm install thesislock-sdk`} />

      <CodeBlock
        language="javascript"
        title="Create a client"
        code={`import { createClient } from 'thesislock-sdk';

// Uses the mainnet deployer and Hiro API by default.
const client = createClient();`}
      />

      <CodeBlock
        language="javascript"
        title="Verify, check a batch, and read a profile"
        code={`// Single anchor lookup.
const single = await client.verify(hash);

// Batch anchors are keyed by hash and owner, so pass the wallet.
const batch = await client.verifyBatch(hash, owner);

// Per-wallet registry data.
const count = await client.getAnchorCount(owner);
const recent = await client.getRecentAnchors(owner);`}
      />

      <p className="mt-4 text-sm text-foreground/70">
        A complete verify workflow: hash a file locally, validate it, then confirm it is anchored on
        Stacks.
      </p>
      <CodeBlock
        language="javascript"
        title="verify-document.mjs"
        code={`import { createClient, hashFile, isValidHash } from 'thesislock-sdk';
import { readFileSync } from 'node:fs';

const client = createClient();

async function verifyDocument(path) {
  const hash = await hashFile(readFileSync(path));
  if (!isValidHash(hash)) {
    throw new Error('Could not hash file at ' + path);
  }

  const result = await client.verify(hash);
  if (result.verified) {
    console.log('Verified hash', hash);
    console.log('Anchored by', result.data.anchoredBy);
    console.log('Stacks block', result.data.stacksBlock);
    return true;
  }

  console.log('Not anchored:', hash);
  return false;
}

verifyDocument('./thesis.pdf').catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});`}
      />
    </div>
  );
}

function PythonGuide() {
  return (
    <div>
      <h3 className="text-xl">Python</h3>
      <p className="mt-2 text-sm text-foreground/70">
        There is no Python SDK, but every endpoint is a plain GET request. Use{" "}
        <code className="font-mono">requests</code> and the standard library{" "}
        <code className="font-mono">hashlib</code> to hash and verify.
      </p>

      <CodeBlock language="bash" title="Install" code={`pip install requests`} />

      <CodeBlock
        language="python"
        title="verify_document.py"
        code={`import hashlib
import requests

BASE = "https://thesis-lock.vercel.app"

def hash_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()

def verify(file_hash):
    resp = requests.get(f"{BASE}/api/verify/{file_hash}", timeout=10)
    resp.raise_for_status()
    return resp.json()

if __name__ == "__main__":
    file_hash = hash_file("thesis.pdf")
    data = verify(file_hash)
    if data.get("verified"):
        print("Anchored by", data["owner"])
        print("Stacks block", data["stacksBlock"])
    else:
        print("Not anchored:", file_hash)`}
      />

      <p className="mt-4 text-sm text-foreground/70">Each endpoint is one call:</p>
      <CodeBlock
        language="python"
        title="Endpoints"
        code={`requests.get(f"{BASE}/api/verify/{file_hash}")
requests.get(f"{BASE}/api/search", params={"q": "thesis"})
requests.get(f"{BASE}/api/stats")
requests.get(f"{BASE}/api/profile/{principal}")
requests.get(f"{BASE}/api/compare", params={"a": hash_a, "b": hash_b})`}
      />

      <p className="mt-4 text-sm text-foreground/70">
        Wrap calls so a bad hash or a network blip fails cleanly:
      </p>
      <CodeBlock
        language="python"
        title="Error handling"
        code={`try:
    resp = requests.get(f"{BASE}/api/verify/{file_hash}", timeout=10)
    resp.raise_for_status()
    data = resp.json()
except requests.HTTPError as exc:
    print("API error:", exc.response.status_code)
except requests.RequestException as exc:
    print("Network error:", exc)`}
      />
    </div>
  );
}

function CurlGuide() {
  return (
    <div>
      <h3 className="text-xl">cURL</h3>
      <p className="mt-2 text-sm text-foreground/70">
        The API returns JSON, so piping to <code className="font-mono">jq</code> gives readable
        output. The base URL is <code className="font-mono">https://thesis-lock.vercel.app</code>.
      </p>

      <CodeBlock
        language="bash"
        title="Verify a hash"
        code={`curl -s https://thesis-lock.vercel.app/api/verify/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06 | jq`}
      />

      <CodeBlock
        language="bash"
        title="Search by label"
        code={`curl -s "https://thesis-lock.vercel.app/api/search?q=thesis" | jq`}
      />

      <CodeBlock
        language="bash"
        title="Read network stats"
        code={`curl -s https://thesis-lock.vercel.app/api/stats | jq`}
      />

      <CodeBlock
        language="bash"
        title="Download a verification badge"
        code={`curl -s https://thesis-lock.vercel.app/api/badge/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06 -o badge.svg`}
      />
    </div>
  );
}

function GithubActionsGuide() {
  return (
    <div>
      <h3 className="text-xl">GitHub Actions</h3>
      <p className="mt-2 text-sm text-foreground/70">
        The reusable action <code className="font-mono">Tim-cryptow/thesis-lock/action@main</code>{" "}
        verifies a document hash from inside any workflow. It reads the public Hiro mainnet API and
        needs no wallet or secret.
      </p>

      <CodeBlock
        language="yaml"
        title="Verify on push"
        code={`name: Verify anchor
on: [push]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify dataset hash
        uses: Tim-cryptow/thesis-lock/action@main
        with:
          file: ./data/dataset.csv
          fail-on-unverified: "true"`}
      />

      <CodeBlock
        language="yaml"
        title="Verify on release"
        code={`name: Verify release artifact
on:
  release:
    types: [published]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Tim-cryptow/thesis-lock/action@main
        with:
          hash: "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"`}
      />

      <p className="mt-4 text-sm text-foreground/70">
        Multi-step: hash a file, verify it, and fail the job if the proof is missing.
      </p>
      <CodeBlock
        language="yaml"
        title="Hash, verify, gate"
        code={`jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify the thesis is anchored
        id: anchor
        uses: Tim-cryptow/thesis-lock/action@main
        with:
          file: ./thesis.pdf
          fail-on-unverified: "true"
      - name: Continue the pipeline
        if: steps.anchor.outcome == 'success'
        run: echo "Anchor confirmed, proceeding"`}
      />
    </div>
  );
}

function CicdGuide() {
  return (
    <div>
      <h3 className="text-xl">CI/CD Generic</h3>
      <p className="mt-2 text-sm text-foreground/70">
        Outside GitHub Actions, the <code className="font-mono">thesislock-cli</code> package
        verifies anchors from any shell, including GitLab CI, CircleCI, and Jenkins.
      </p>

      <CodeBlock
        language="bash"
        title="Any CI pipeline"
        code={`npm install -g thesislock-cli

# The package installs a "thesislock" binary. Hash a file and check its
# anchor in one step; the exit code is non-zero when it is not anchored.
thesislock hash ./thesis.pdf --verify`}
      />

      <p className="mt-4 text-sm text-foreground/70">
        Run it in a container without a global install:
      </p>
      <CodeBlock
        language="bash"
        title="Docker"
        code={`docker run --rm -v "$PWD:/work" -w /work node:20-alpine \\
  npx --yes thesislock-cli hash ./thesis.pdf --verify`}
      />

      <p className="mt-4 text-sm text-foreground/70">
        Verify several files and fail on the first one that is not anchored:
      </p>
      <CodeBlock
        language="bash"
        title="verify-all.sh"
        code={`#!/usr/bin/env bash
set -euo pipefail

files=("thesis.pdf" "dataset.csv" "appendix.zip")

for file in "\${files[@]}"; do
  echo "Verifying $file"
  if ! npx --yes thesislock-cli hash "./$file" --verify; then
    echo "Not anchored: $file"
    exit 1
  fi
done

echo "All files verified"`}
      />
    </div>
  );
}

export default function IntegrationGuidesClient({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl">Integration Guides</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Copy-ready examples for verifying anchors from your own apps and pipelines.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Integration languages"
        className="flex flex-wrap gap-1 border-b border-foreground/10"
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "javascript" ? <JavaScriptGuide /> : null}
        {activeTab === "python" ? <PythonGuide /> : null}
        {activeTab === "curl" ? <CurlGuide /> : null}
        {activeTab === "github" ? <GithubActionsGuide /> : null}
        {activeTab === "cicd" ? <CicdGuide /> : null}
      </div>
    </div>
  );
}
