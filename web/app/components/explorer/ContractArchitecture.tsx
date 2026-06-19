"use client";

import { CONTRACT_BLURBS } from "@/lib/contractExplorer";

// A pure CSS/HTML map of how the five contracts relate. The core anchor sits at
// the center; batch, registry, and proof are companions that extend it; groups
// is an independent contract with its own shared history. Every box selects its
// contract's detail view.

function Box({
  name,
  role,
  onSelect,
  variant = "companion",
}: {
  name: string;
  role: string;
  onSelect: (name: string) => void;
  variant?: "core" | "companion" | "independent";
}) {
  const base =
    "w-full rounded-lg border px-4 py-3 text-left transition hover:border-foreground/40";
  const variantClass =
    variant === "core"
      ? "border-foreground/40 bg-card"
      : variant === "independent"
        ? "border-dashed border-foreground/25 bg-card"
        : "border-foreground/15 bg-card";
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      className={`${base} ${variantClass}`}
    >
      <span className="block font-mono text-sm">{name}</span>
      <span className="block text-xs text-foreground/55">{role}</span>
    </button>
  );
}

// A short vertical connector line.
function Tick() {
  return <span aria-hidden className="block h-5 w-px bg-foreground/20" />;
}

export default function ContractArchitecture({
  onSelect,
}: {
  onSelect: (name: string) => void;
}) {
  return (
    <section className="rounded-lg border border-foreground/10 bg-background/40 p-6">
      <h2 className="text-xl mb-1">Architecture</h2>
      <p className="text-sm text-foreground/60 mb-6 max-w-2xl">
        Companion contracts extend the core anchoring with batch, indexing,
        proof, and group capabilities. Select any box to inspect that contract.
      </p>

      <div className="flex flex-col items-center gap-0">
        {/* Companion row */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Box
            name="thesislock-batch"
            role="Batch operations"
            onSelect={onSelect}
          />
          <Box
            name="thesislock-registry"
            role="History index"
            onSelect={onSelect}
          />
          <Box
            name="thesislock-proof"
            role="NFT proofs"
            onSelect={onSelect}
          />
        </div>

        {/* Connectors from the three companions down to the core */}
        <div className="flex w-full max-w-2xl items-start justify-around">
          <Tick />
          <Tick />
          <Tick />
        </div>
        <span
          aria-hidden
          className="h-px w-full max-w-2xl bg-foreground/20"
        />
        <Tick />

        {/* Core */}
        <div className="w-full max-w-md">
          <Box
            name="thesislock"
            role="Core single-hash anchor"
            onSelect={onSelect}
            variant="core"
          />
        </div>

        {/* Independent contract */}
        <div className="mt-8 w-full max-w-md">
          <div className="mb-2 text-center text-xs uppercase tracking-wide text-foreground/40">
            Independent
          </div>
          <Box
            name="thesislock-groups"
            role={CONTRACT_BLURBS["thesislock-groups"]}
            onSelect={onSelect}
            variant="independent"
          />
        </div>
      </div>
    </section>
  );
}
