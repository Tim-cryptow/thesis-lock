import { type ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import { REPO_URL } from "@/lib/docs";
import DocsSidebar from "./DocsSidebar";
import EditOnGithub from "./EditOnGithub";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-foreground/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4 text-sm">
          <Link href="/" className="text-foreground/60 hover:text-foreground transition">
            &larr; ThesisLock
          </Link>
          <span className="text-foreground/30">/</span>
          <Link href="/docs" className="text-foreground/80 hover:text-foreground transition">
            Docs
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <EditOnGithub />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 md:grid md:grid-cols-[14rem_1fr] md:gap-10">
        <aside className="mb-8 md:mb-0">
          <DocsSidebar />
        </aside>
        <article className="min-w-0 max-w-3xl">
          <Breadcrumbs />
          {children}
        </article>
      </div>

      <footer className="mt-auto border-t border-foreground/10 py-6 px-6 text-sm text-foreground/60">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ThesisLock Documentation</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground transition">
              Docs home
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
