"use client";

import Link from "next/link";
import ValidatedInput from "@/app/components/ValidatedInput";
import { validateAddress } from "@/lib/validators";

export function sanitizeAddress(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function truncate(address: string): string {
  return address.length > 16
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : address;
}

type AddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  helpText?: string;
};

// A Stacks address field built on ValidatedInput. When the address is valid it
// shows a truncated preview and a link to that wallet's profile.
export default function AddressInput({
  value,
  onChange,
  label = "Stacks address",
  placeholder = "SP... or ST...",
  id,
  required,
  helpText,
}: AddressInputProps) {
  const valid = validateAddress(value).valid;
  return (
    <div>
      <ValidatedInput
        value={value}
        onChange={(v) => onChange(sanitizeAddress(v))}
        validator={validateAddress}
        label={label}
        placeholder={placeholder}
        id={id}
        required={required}
        helpText={helpText}
        mono
        autoComplete="off"
        spellCheck={false}
      />
      {valid ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
          <code className="font-mono">{truncate(value)}</code>
          <Link
            href={`/u/${value}`}
            className="underline hover:no-underline"
          >
            View profile &rarr;
          </Link>
        </div>
      ) : null}
    </div>
  );
}
