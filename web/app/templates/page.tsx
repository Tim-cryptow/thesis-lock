"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { GENERIC_TEMPLATE_ID, TEMPLATES, buildLabel, type AnchorTemplate } from "@/lib/templates";

// A representative label built from each field's placeholder, so the library
// shows what a real structured label looks like for every template.
function exampleLabel(template: AnchorTemplate): string {
  if (template.id === GENERIC_TEMPLATE_ID) {
    return template.fields[0].placeholder.replace(/^e\.g\.\s*/, "");
  }
  const values = Object.fromEntries(template.fields.map((field) => [field.key, field.placeholder]));
  return buildLabel(template, values);
}

export default function TemplatesPage() {
  const { t } = useI18n();

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap mb-10">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link href="/anchor" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.anchor")}
        </Link>
        <Link href="/anchors" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.myAnchors")}
        </Link>
        <Link href="/report" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.report")}
        </Link>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.docs")}
        </Link>
        <span className="text-foreground font-medium">{t("common.nav.templates")}</span>
      </div>

      <h1 className="text-3xl mb-2">{t("templates.page.heading")}</h1>
      <p className="text-foreground/70 mb-8 max-w-2xl">{t("templates.page.intro")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-foreground/10 bg-card p-5 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-heading text-background text-sm font-semibold"
              >
                {template.icon}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg leading-tight">{template.name}</h2>
                <span className="text-[10px] uppercase tracking-wide text-foreground/50">
                  {template.category}
                </span>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-4">{template.description}</p>

            <div className="mb-4">
              <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                {t("templates.page.exampleHeading")}
              </div>
              <code className="font-mono text-xs break-all bg-foreground/5 px-2 py-1 rounded block">
                {exampleLabel(template)}
              </code>
            </div>

            {template.id !== GENERIC_TEMPLATE_ID && (
              <div className="mb-4">
                <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                  {t("templates.page.fieldsHeading")}
                </div>
                <ul className="text-xs text-foreground/70 space-y-0.5">
                  {template.fields.map((field) => (
                    <li key={field.key} className="flex items-center gap-2">
                      <span>{field.name}</span>
                      {field.required && (
                        <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                          {t("templates.page.requiredTag")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href={`/anchor?template=${template.id}`}
              className="mt-auto inline-flex items-center justify-center text-sm px-4 py-2 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
            >
              {t("templates.page.use")}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-lg mb-1">{t("templates.page.custom.heading")}</h2>
        <p className="text-sm text-foreground/70">{t("templates.page.custom.body")}</p>
      </div>
    </div>
  );
}
