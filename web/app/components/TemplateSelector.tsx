"use client";

import { TEMPLATES, type AnchorTemplate } from "@/lib/templates";
import { useI18n } from "@/app/components/I18nProvider";

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  // "grid" shows selectable cards (single mode and the templates library).
  // "compact" renders a single labelled dropdown for the batch default and
  // per-file overrides, where the full card grid would be too heavy.
  variant?: "grid" | "compact";
  // Used by the compact variant for the visible label and the select id.
  label?: string;
  selectId?: string;
  templates?: AnchorTemplate[];
};

export default function TemplateSelector({
  selectedId,
  onSelect,
  variant = "grid",
  label,
  selectId,
  templates = TEMPLATES,
}: Props) {
  const { t } = useI18n();

  if (variant === "compact") {
    return (
      <div>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs text-foreground/50 uppercase tracking-wide mb-1"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card text-sm focus:outline-none focus:border-foreground/50"
        >
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm text-foreground/60 mb-1">{t("templates.selector.heading")}</div>
      <p className="text-xs text-foreground/50 mb-3">{t("templates.selector.description")}</p>
      <div
        role="radiogroup"
        aria-label={t("templates.selector.heading")}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
      >
        {templates.map((tpl) => {
          const active = tpl.id === selectedId;
          return (
            <button
              key={tpl.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(tpl.id)}
              title={tpl.description}
              className={`text-left rounded-lg border p-3 transition ${
                active
                  ? "border-foreground/50 bg-foreground/5"
                  : "border-foreground/10 hover:border-foreground/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  aria-hidden="true"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-heading text-background text-xs font-semibold"
                >
                  {tpl.icon}
                </span>
                <span className="text-sm font-medium truncate">{tpl.name}</span>
              </div>
              <span className="inline-block text-[10px] uppercase tracking-wide text-foreground/50 border border-foreground/15 rounded px-1.5 py-0.5">
                {tpl.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
