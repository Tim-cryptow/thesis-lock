"use client";

import Tooltip from "./Tooltip";
import { getDefinition } from "@/lib/glossary";

type HelpTextProps = {
  // A glossary term key. The matching definition is shown in the tooltip.
  term: string;
  // Optional override text, used when a spot needs wording the glossary lacks.
  custom?: string;
};

// A small info icon placed next to a label. On hover it explains the term in
// plain English, so users learn the concept in context. Renders nothing when
// the term is unknown and no custom text is given.
export default function HelpText({ term, custom }: HelpTextProps) {
  const content = custom ?? getDefinition(term);
  if (!content) return null;

  return (
    <span className="ml-1 inline-flex align-middle">
      <Tooltip content={content} label={`What is ${term}?`} />
    </span>
  );
}
