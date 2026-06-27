"use client";

import { useEffect, useId, useState } from "react";
import HelpText from "@/app/components/HelpText";
import type { ValidationResult } from "@/lib/validators";

type ValidatedInputProps = {
  value: string;
  onChange: (value: string) => void;
  validator?: (value: string) => ValidationResult;
  label: string;
  placeholder?: string;
  maxLength?: number;
  helpText?: string;
  // Message shown (in green) when the value is valid and non-empty.
  validText?: string;
  required?: boolean;
  id?: string;
  type?: string;
  // Optional glossary tooltip shown next to the label.
  helpTerm?: string;
  // Optional onboarding-tour hook forwarded to the input.
  dataTour?: string;
  autoComplete?: string;
  spellCheck?: boolean;
  // Render the value in monospace (used by hash and address inputs).
  mono?: boolean;
};

// A labelled text input that validates its value, shows a debounced error
// message, a live character counter, and a checkmark when the value is valid.
// The border tracks the state: neutral, red on error, green when valid.
export default function ValidatedInput({
  value,
  onChange,
  validator,
  label,
  placeholder,
  maxLength,
  helpText,
  validText,
  required = false,
  id: idProp,
  type = "text",
  helpTerm,
  dataTour,
  autoComplete,
  spellCheck,
  mono = false,
}: ValidatedInputProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const statusId = `${id}-status`;

  // Validation runs against a debounced copy of the value so the message does
  // not flash on every keystroke.
  const [debounced, setDebounced] = useState(value);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  const result = validator ? validator(debounced) : { valid: true };
  const showError = touched && !result.valid && Boolean(result.error);
  const showValid = Boolean(validator) && result.valid && debounced.trim().length > 0;

  const borderClass = showError
    ? "border-red-500/70 focus:border-red-500"
    : showValid
      ? "border-green-500/60 focus:border-green-500"
      : "border-foreground/15 focus:border-foreground/50";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center text-sm text-foreground/60">
          <label htmlFor={id}>
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          {helpTerm ? <HelpText term={helpTerm} /> : null}
        </span>
        {typeof maxLength === "number" ? (
          <span className="font-mono text-xs text-foreground/50">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            setTouched(true);
            onChange(e.target.value);
          }}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          maxLength={maxLength}
          data-tour={dataTour}
          autoComplete={autoComplete}
          spellCheck={spellCheck}
          aria-invalid={showError || undefined}
          aria-describedby={statusId}
          className={`w-full rounded-md border bg-card px-3 py-2 outline-none transition ${
            mono ? "font-mono text-sm" : ""
          } ${showValid ? "pr-9" : ""} ${borderClass}`}
        />
        {showValid ? (
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </div>

      <div id={statusId} className="mt-1 min-h-[1rem] text-xs">
        {showError ? (
          <span className="text-red-600 dark:text-red-400" role="alert">
            {result.error}
          </span>
        ) : showValid && validText ? (
          <span className="text-green-600 dark:text-green-400">{validText}</span>
        ) : helpText ? (
          <span className="text-foreground/50">{helpText}</span>
        ) : null}
      </div>
    </div>
  );
}
