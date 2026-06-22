// Plain-English explanations of the technical terms ThesisLock uses, shown in
// contextual tooltips throughout the app and on the glossary page. Keeping them
// in one place means a term reads the same everywhere.

export type GlossaryEntry = {
  term: string;
  definition: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "SHA-256 Hash",
    definition:
      "A unique digital fingerprint of your file. Even a tiny change produces a completely different hash.",
  },
  {
    term: "Stacks Block",
    definition:
      "A group of transactions confirmed on the Stacks blockchain. Each block has a unique number.",
  },
  {
    term: "Burn Block",
    definition:
      "The corresponding Bitcoin block that anchors this Stacks block to the Bitcoin blockchain.",
  },
  {
    term: "Principal",
    definition:
      "A Stacks wallet address that identifies who performed an action.",
  },
  {
    term: "Anchor",
    definition:
      "Recording a document's hash on the blockchain to prove it existed at a specific time.",
  },
  {
    term: "Proof NFT",
    definition:
      "A non-transferable token in your wallet that serves as permanent proof you anchored a document.",
  },
  {
    term: "Label",
    definition: "An optional tag you attach to your anchor for easy identification.",
  },
  {
    term: "Batch Anchor",
    definition: "Anchoring up to 10 document hashes in a single transaction.",
  },
  {
    term: "Group",
    definition:
      "A shared space where team members can anchor documents together.",
  },
  {
    term: "Registry",
    definition: "An on-chain index that tracks all your anchors for easy lookup.",
  },
  {
    term: "Gas Fee",
    definition:
      "A small STX payment to process your transaction on the blockchain.",
  },
];

const DEFINITIONS = new Map(
  GLOSSARY.map((entry) => [entry.term.toLowerCase(), entry.definition]),
);

export function getDefinition(term: string): string | undefined {
  return DEFINITIONS.get(term.trim().toLowerCase());
}
