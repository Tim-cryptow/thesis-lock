"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { validateHash } from "@/lib/validators";

// Inline search shown on the global 404 page. A valid 64-character hash jumps
// straight to its verification page; anything else is handed to the search page
// as a free-text query.
export default function ErrorSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (validateHash(trimmed).valid) {
      const hash = trimmed.replace(/^0x/i, "").toLowerCase();
      router.push(`/v/${hash}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 mx-auto max-w-md text-left">
      <label
        htmlFor="error-search"
        className="block text-sm font-medium text-foreground/70 mb-2"
      >
        Looking for a hash?
      </label>
      <div className="flex gap-2">
        <input
          id="error-search"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste a hash or search term"
          spellCheck={false}
          className="flex-1 min-w-0 rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm font-mono focus:border-foreground/40 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 px-4 py-2 rounded-md bg-heading text-background text-sm font-medium hover:opacity-90 press-scale"
        >
          Search
        </button>
      </div>
    </form>
  );
}
