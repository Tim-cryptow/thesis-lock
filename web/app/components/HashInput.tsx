"use client";

import ValidatedInput from "@/app/components/ValidatedInput";
import { validateHash } from "@/lib/validators";

// Strips surrounding whitespace and newlines (from a pasted block), drops a
// leading "0x", and lowercases, so a hash copied from anywhere lands clean.
export function sanitizeHash(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/^0x/i, "").toLowerCase();
}

type HashInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  helpText?: string;
};

// A hash field built on ValidatedInput: paste-friendly auto-formatting and the
// shared 64-hex validation, shown in monospace.
export default function HashInput({
  value,
  onChange,
  label = "Document hash",
  placeholder = "64-character SHA-256 hash",
  id,
  required,
  helpText,
}: HashInputProps) {
  return (
    <ValidatedInput
      value={value}
      onChange={(v) => onChange(sanitizeHash(v))}
      validator={validateHash}
      label={label}
      placeholder={placeholder}
      id={id}
      required={required}
      helpText={helpText}
      validText="Valid SHA-256 hash"
      mono
      autoComplete="off"
      spellCheck={false}
    />
  );
}
