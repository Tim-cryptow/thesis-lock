"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS } from "@/lib/docs";
import { useI18n } from "@/app/components/I18nProvider";

const NAV = [{ slug: "", title: "Overview" }, ...DOCS];

export default function DocsSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const isActive = (slug: string) => {
    const href = slug ? `/docs/${slug}` : "/docs";
    return pathname === href;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="docs-nav"
        className="md:hidden mb-4 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        {open ? t("docs.close") : t("docs.menu")}
      </button>

      <nav
        id="docs-nav"
        aria-label={t("docs.navAria")}
        className={`${open ? "block" : "hidden"} md:block md:sticky md:top-8`}
      >
        <ul className="space-y-1">
          {NAV.map((item) => {
            const href = item.slug ? `/docs/${item.slug}` : "/docs";
            const active = isActive(item.slug);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-foreground/5 text-foreground font-medium"
                      : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {item.slug === "" ? t("docs.overview") : item.title}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/glossary"
              onClick={() => setOpen(false)}
              aria-current={pathname === "/glossary" ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                pathname === "/glossary"
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              Glossary
            </Link>
          </li>
          <li>
            <Link
              href="/developers"
              onClick={() => setOpen(false)}
              aria-current={pathname === "/developers" ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                pathname === "/developers"
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              Developer Portal
            </Link>
          </li>
          <li>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              aria-current={pathname === "/help" ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                pathname === "/help"
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              Help Center
            </Link>
          </li>
          <li>
            <Link
              href="/changelog"
              onClick={() => setOpen(false)}
              aria-current={pathname === "/changelog" ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                pathname === "/changelog"
                  ? "bg-foreground/5 text-foreground font-medium"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              Releases
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
