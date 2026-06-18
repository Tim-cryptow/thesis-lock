import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Integration Guides | ThesisLock Docs" },
  description:
    "Copy-ready examples for verifying ThesisLock anchors from JavaScript, Python, cURL, GitHub Actions, and any CI/CD pipeline.",
};

export default function IntegrationGuides() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Integration Guides</h1>
      <Lead>
        The developer portal ships runnable examples for every common
        integration path. Each tab has copy buttons, and the quick start gets you
        verifying a document in three steps.
      </Lead>
      <P>
        Open the{" "}
        <Link
          href="/developers#guides"
          className="underline hover:text-foreground"
        >
          Integration Guides tab
        </Link>{" "}
        in the developer portal for the full, copy-ready examples.
      </P>

      <H2>What is covered</H2>
      <List
        items={[
          <>
            <strong>JavaScript and Node.js</strong>: install the{" "}
            <Code>thesislock-sdk</Code>, create a client, verify a hash, check a
            batch, and read a profile, with a complete verify workflow.
          </>,
          <>
            <strong>Python</strong>: hash a file with <Code>hashlib</Code> and
            verify it through the JSON API with <Code>requests</Code>, including
            error handling.
          </>,
          <>
            <strong>cURL</strong>: one command per endpoint, piped to{" "}
            <Code>jq</Code> for readable output.
          </>,
          <>
            <strong>GitHub Actions</strong>: gate a pipeline with{" "}
            <Code>Tim-cryptow/thesis-lock/action@main</Code> on push, on release,
            and as a hash-verify-fail sequence.
          </>,
          <>
            <strong>CI/CD Generic</strong>: run <Code>thesislock-cli</Code> in any
            pipeline, including a Docker container and a multi-file bash script.
          </>,
        ]}
      />

      <H2>Quick start</H2>
      <P>Install the SDK and verify a document:</P>
      <CodeBlock language="bash">{`npm install thesislock-sdk`}</CodeBlock>
      <CodeBlock language="ts">{`import { createClient } from 'thesislock-sdk';

const client = createClient();
const result = await client.verify(hash);
console.log(result.verified);`}</CodeBlock>

      <P>
        For the underlying APIs, see the{" "}
        <Link href="/docs/sdk" className="underline hover:text-foreground">
          SDK Guide
        </Link>
        , the{" "}
        <Link href="/docs/api" className="underline hover:text-foreground">
          REST API
        </Link>
        , and the{" "}
        <Link
          href="/docs/github-action"
          className="underline hover:text-foreground"
        >
          GitHub Action
        </Link>
        .
      </P>
    </div>
  );
}
