"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MAX_TAGS_PER_ANCHOR,
  TAGS_CHANGED_EVENT,
  getAllTags,
  getTagColor,
  getTagsForHash,
  normalizeTag,
  setTagsForHash,
  suggestTags,
} from "@/lib/tags";

type TagInputProps = {
  hash: string;
  // When omitted, the current tags are read from storage on mount.
  initialTags?: string[];
  // The anchor's label, used to offer template and keyword suggestions.
  label?: string;
  onTagsChange?: (tags: string[]) => void;
  // Small pills and a tighter input, for inline use inside a list row.
  compact?: boolean;
};

type Option =
  | { kind: "existing"; value: string; count: number }
  | { kind: "suggested"; value: string }
  | { kind: "create"; value: string };

// Tinted pill styling derived from a tag's color, legible on both themes.
function pillStyle(color: string) {
  return {
    backgroundColor: `${color}1f`,
    color,
    borderColor: `${color}55`,
  };
}

export default function TagInput({
  hash,
  initialTags,
  label = "",
  onTagsChange,
  compact = false,
}: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [allTags, setAllTags] = useState<{ name: string; count: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // After mount, and whenever tags change here, in another component, or in
  // another tab, reload this anchor's tags and the known-tag list. Reloading the
  // current hash keeps an open editor from committing stale state over a
  // concurrent edit. The first render uses initialTags (or empty) so the server
  // and client markup match before this runs.
  useEffect(() => {
    const sync = () => {
      setTags(getTagsForHash(hash));
      setAllTags(getAllTags().map((t) => ({ name: t.name, count: t.count })));
    };
    sync();
    window.addEventListener(TAGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [hash]);

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const atCap = tags.length >= MAX_TAGS_PER_ANCHOR;

  const commit = useCallback(
    (next: string[]) => {
      setTags(next);
      setTagsForHash(hash, next);
      onTagsChange?.(next);
    },
    [hash, onTagsChange],
  );

  const addTags = useCallback(
    (raw: string | string[]) => {
      const incoming = Array.isArray(raw) ? raw : [raw];
      let next = tags.slice();
      for (const candidate of incoming) {
        const name = normalizeTag(candidate);
        if (!name || next.includes(name)) continue;
        if (next.length >= MAX_TAGS_PER_ANCHOR) break;
        next.push(name);
      }
      if (next.length !== tags.length) commit(next);
      setQuery("");
      setHighlight(0);
    },
    [tags, commit],
  );

  const remove = useCallback(
    (name: string) => {
      commit(tags.filter((t) => t !== name));
    },
    [tags, commit],
  );

  const normalizedQuery = normalizeTag(query);

  const options = useMemo<Option[]>(() => {
    const taken = new Set(tags);
    const out: Option[] = [];
    const seen = new Set<string>();

    // Existing tags that match the query, most used first (getAllTags is sorted).
    for (const t of allTags) {
      if (taken.has(t.name) || seen.has(t.name)) continue;
      if (normalizedQuery && !t.name.includes(normalizedQuery)) continue;
      out.push({ kind: "existing", value: t.name, count: t.count });
      seen.add(t.name);
    }

    // Suggestions from the anchor's label that are not already taken or listed.
    for (const s of suggestTags(label)) {
      if (taken.has(s) || seen.has(s)) continue;
      if (normalizedQuery && !s.includes(normalizedQuery)) continue;
      out.push({ kind: "suggested", value: s });
      seen.add(s);
    }

    // Offer to create the typed tag when it is new.
    if (
      normalizedQuery &&
      !taken.has(normalizedQuery) &&
      !seen.has(normalizedQuery)
    ) {
      out.push({ kind: "create", value: normalizedQuery });
    }
    return out;
  }, [allTags, label, normalizedQuery, tags]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = options[highlight];
      if (chosen) addTags(chosen.value);
      else if (normalizedQuery) addTags(normalizedQuery);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      addTags(text.split(","));
    }
  };

  const pillSize = compact
    ? "px-2 py-0.5 text-[11px]"
    : "px-2.5 py-1 text-xs";

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((name) => (
          <span
            key={name}
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${pillSize}`}
            style={pillStyle(getTagColor(name))}
          >
            {name}
            <button
              type="button"
              onClick={() => remove(name)}
              aria-label={`Remove tag ${name}`}
              className="opacity-70 hover:opacity-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={compact ? "h-2.5 w-2.5" : "h-3 w-3"}
                aria-hidden="true"
              >
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </span>
        ))}
        {!atCap && (
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={tags.length === 0 ? "Add tags" : "Add"}
            aria-label="Add a tag"
            className={`min-w-24 flex-1 bg-transparent outline-none placeholder:text-foreground/40 ${
              compact ? "py-0.5 text-[11px]" : "py-1 text-sm"
            }`}
          />
        )}
      </div>

      {atCap && (
        <p className="mt-1 text-[11px] text-foreground/50">
          Tag limit reached ({MAX_TAGS_PER_ANCHOR}).
        </p>
      )}

      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-64 overflow-auto rounded-md border border-foreground/10 bg-background shadow-lg"
        >
          {options.map((opt, i) => (
            <li key={`${opt.kind}-${opt.value}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => addTags(opt.value)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-foreground/10" : "hover:bg-foreground/5"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getTagColor(opt.value) }}
                    aria-hidden="true"
                  />
                  {opt.kind === "create" ? (
                    <span>
                      Create <span className="font-medium">{opt.value}</span>
                    </span>
                  ) : (
                    <span>{opt.value}</span>
                  )}
                </span>
                {opt.kind === "existing" && (
                  <span className="text-xs text-foreground/40">{opt.count}</span>
                )}
                {opt.kind === "suggested" && (
                  <span className="text-[10px] uppercase tracking-wide text-foreground/40">
                    suggested
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
