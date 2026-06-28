import Link from "next/link";
import { helpHref } from "@/lib/help";

type HelpLinkProps = {
  // A FAQ, guide, or troubleshooting slug, resolved to the right help page anchor.
  topic: string;
  // Accessible label and tooltip. Defaults to a generic help label.
  label?: string;
  className?: string;
};

// A subtle inline "?" that links to a specific help topic, for placing next to an
// input, tab, or result. It opens in the same tab to the relevant help section.
export default function HelpLink({ topic, label = "Help", className = "" }: HelpLinkProps) {
  return (
    <Link
      href={helpHref(topic)}
      aria-label={label}
      title={label}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/25 align-middle text-[0.6rem] font-medium leading-none text-foreground/50 transition hover:border-foreground/50 hover:text-foreground ${className}`}
    >
      <span aria-hidden="true">?</span>
    </Link>
  );
}
