import { type ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Breadcrumbs from "@/app/components/Breadcrumbs";

// Sections of the help center, shown as a sub-nav on every help page.
const HELP_NAV = [
  { href: "/help", label: "Help" },
  { href: "/help/faq", label: "FAQ" },
  { href: "/help/guides", label: "Guides" },
  { href: "/help/troubleshooting", label: "Troubleshooting" },
  { href: "/help/contact", label: "Contact" },
];

export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-foreground/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4 text-sm">
          <Link href="/" className="text-foreground/60 hover:text-foreground transition">
            &larr; ThesisLock
          </Link>
          <span className="text-foreground/30">/</span>
          <Link href="/help" className="text-foreground/80 hover:text-foreground transition">
            Help
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex-1">
        <nav aria-label="Help sections" className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {HELP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground/70 transition hover:text-foreground nav-underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Breadcrumbs />
        {children}
      </div>
    </div>
  );
}
