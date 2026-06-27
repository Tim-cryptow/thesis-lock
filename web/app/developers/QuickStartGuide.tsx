"use client";

import { useState } from "react";
import CodeBlock from "@/app/components/CodeBlock";
import type { GuideTabId } from "./IntegrationGuidesClient";

type Props = {
  // Switches the integration guides to the full tab for a step.
  onLearnMore: (tab: GuideTabId) => void;
};

type Step = {
  title: string;
  description: string;
  code: string;
  language: string;
  tab: GuideTabId;
  more: string;
};

const STEPS: Step[] = [
  {
    title: "Install the SDK",
    description: "The thesislock-sdk package verifies anchors from any Node.js project.",
    code: "npm install thesislock-sdk",
    language: "bash",
    tab: "javascript",
    more: "The SDK is read-only and works with the global fetch on Node.js 18 or newer.",
  },
  {
    title: "Verify a document",
    description: "Create a client and confirm a hash is anchored on Stacks mainnet.",
    code: `import { createClient } from 'thesislock-sdk';

const client = createClient();
const result = await client.verify(hash);
console.log(result.verified);`,
    language: "javascript",
    tab: "javascript",
    more: "A verified result includes who anchored the hash and the Stacks block it landed in.",
  },
  {
    title: "Integrate in CI",
    description: "Gate a pipeline on a document being anchored, with no wallet or secret.",
    code: `- uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./thesis.pdf
    fail-on-unverified: "true"`,
    language: "yaml",
    tab: "github",
    more: "The action reads the public Hiro mainnet API and fails the step when the proof is missing.",
  },
];

function QuickStartStep({
  step,
  index,
  onLearnMore,
}: {
  step: Step;
  index: number;
  onLearnMore: (tab: GuideTabId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-sm font-medium">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-medium">{step.title}</h4>
        <p className="mt-1 text-sm text-foreground/70">{step.description}</p>
        <CodeBlock language={step.language} code={step.code} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-sm text-foreground/60 underline hover:text-foreground"
        >
          {open ? "Hide details" : "Learn more"}
        </button>
        {open ? (
          <div className="mt-2 text-sm text-foreground/70">
            <p>{step.more}</p>
            <button
              type="button"
              onClick={() => onLearnMore(step.tab)}
              className="mt-2 text-foreground underline hover:text-foreground/70"
            >
              Open the full guide
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function QuickStartGuide({ onLearnMore }: Props) {
  return (
    <section className="rounded-lg border border-foreground/10 bg-foreground/5 p-6">
      <h3 className="text-xl">Quick Start</h3>
      <p className="mt-1 text-sm text-foreground/70">Verify your first document in three steps.</p>
      <ol className="mt-6 flex flex-col gap-6">
        {STEPS.map((step, index) => (
          <QuickStartStep key={step.title} step={step} index={index} onLearnMore={onLearnMore} />
        ))}
      </ol>
    </section>
  );
}
