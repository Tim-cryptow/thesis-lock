"use client";

import {
  MAX_LABEL_LENGTH,
  buildLabel,
  buildRawLabel,
  templateFieldError,
  type AnchorTemplate,
} from "@/lib/templates";
import { useI18n } from "@/app/components/I18nProvider";

type Props = {
  template: AnchorTemplate;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  // Prefixes input ids so multiple instances (batch rows) stay unique.
  idPrefix?: string;
};

export default function TemplateFields({
  template,
  values,
  onChange,
  disabled,
  idPrefix = "tpl",
}: Props) {
  const { t } = useI18n();

  const preview = buildLabel(template, values);
  const rawLength = buildRawLabel(template, values).length;
  const truncated = rawLength > MAX_LABEL_LENGTH;

  return (
    <div className="space-y-4">
      {template.fields.map((field) => {
        const value = values[field.key] ?? "";
        const error = templateFieldError(field, value);
        const inputId = `${idPrefix}-${field.key}`;
        return (
          <div key={field.key}>
            <label
              htmlFor={inputId}
              className="flex items-center gap-2 text-sm text-foreground/60 mb-1"
            >
              <span>{field.name}</span>
              {!field.required && (
                <span className="text-xs text-foreground/40">
                  {t("templates.field.optionalTag")}
                </span>
              )}
            </label>
            <input
              id={inputId}
              value={value}
              onChange={(e) => onChange(field.key, e.target.value.slice(0, field.maxLength))}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card text-sm focus:outline-none focus:border-foreground/50 disabled:opacity-60"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={error ? "text-red-600 dark:text-red-400" : "text-transparent"}
                role={error ? "alert" : undefined}
              >
                {error === "asciiOnly"
                  ? t("anchor.label.asciiOnly")
                  : error === "required"
                    ? t("templates.field.required", { name: field.name })
                    : "."}
              </span>
              <span className="text-foreground/50 font-mono">
                {value.length}/{field.maxLength}
              </span>
            </div>
          </div>
        );
      })}

      <div className="rounded-md border border-foreground/10 bg-foreground/5 p-3">
        <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
          {t("templates.preview.heading")}
        </div>
        {preview ? (
          <code className="font-mono text-xs break-all">{preview}</code>
        ) : (
          <p className="text-xs text-foreground/50">{t("templates.preview.empty")}</p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs">
          {truncated ? (
            <span className="text-amber-700 dark:text-amber-400" role="alert">
              {t("templates.warning.truncated", { max: MAX_LABEL_LENGTH })}
            </span>
          ) : (
            <span className="text-transparent">.</span>
          )}
          <span className="text-foreground/50 font-mono">
            {Math.min(rawLength, MAX_LABEL_LENGTH)}/{MAX_LABEL_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
