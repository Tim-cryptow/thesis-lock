import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  body: string;
  href: string;
  icon: ReactNode;
};

export default function FeatureCard({ title, body, href, icon }: Props) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-foreground/10 bg-card p-6 flex flex-col hover:border-foreground/40 transition"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 text-foreground/70 mb-4"
        aria-hidden="true"
      >
        {icon}
      </svg>
      <h3 className="text-xl mb-2 group-hover:text-foreground transition">
        {title}
      </h3>
      <p className="text-foreground/80 text-sm leading-relaxed">{body}</p>
    </Link>
  );
}
