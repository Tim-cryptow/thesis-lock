"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TAGS_CHANGED_EVENT,
  getAllTags,
  getTagColor,
  normalizeTag,
  type Tag,
} from "@/lib/tags";

type TagFilterProps = {
  selectedTags: string[];
  onFilterChange: (tags: string[]) => void;
  // Show the search box past this many tags. Defaults to a sensible threshold.
  searchThreshold?: number;
};

export default function TagFilter({
  selectedTags,
  onFilterChange,
  searchThreshold = 8,
}: TagFilterProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const sync = () => setAllTags(getAllTags());
    sync();
    window.addEventListener(TAGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Drop selections for tags that no longer exist (e.g. the last anchor carrying
  // a filtered tag was untagged), so the parent list does not keep filtering by a
  // gone tag with no in-page way to recover.
  useEffect(() => {
    if (selectedTags.length === 0) return;
    const names = new Set(allTags.map((t) => t.name));
    const valid = selectedTags.filter((t) => names.has(t));
    if (valid.length !== selectedTags.length) onFilterChange(valid);
  }, [allTags, selectedTags, onFilterChange]);

  const selected = useMemo(() => new Set(selectedTags), [selectedTags]);

  const visible = useMemo(() => {
    const q = normalizeTag(query);
    return q ? allTags.filter((t) => t.name.includes(q)) : allTags;
  }, [allTags, query]);

  if (allTags.length === 0) return null;

  const toggle = (name: string) => {
    if (selected.has(name)) {
      onFilterChange(selectedTags.filter((t) => t !== name));
    } else {
      onFilterChange([...selectedTags, name]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          Tags
        </span>
        {allTags.length > searchThreshold && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tags"
            aria-label="Filter tags"
            className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs outline-none focus:border-foreground/30"
          />
        )}
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange([])}
            className="ml-auto text-xs text-foreground/60 hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {visible.map((tag) => {
          const active = selected.has(tag.name);
          const color = getTagColor(tag.name);
          return (
            <button
              key={tag.name}
              type="button"
              onClick={() => toggle(tag.name)}
              aria-pressed={active}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition"
              style={
                active
                  ? { backgroundColor: color, color: "#ffffff", borderColor: color }
                  : {
                      backgroundColor: `${color}1f`,
                      color,
                      borderColor: `${color}55`,
                    }
              }
            >
              {tag.name}
              <span
                className="rounded-full px-1 text-[10px]"
                style={
                  active
                    ? { backgroundColor: "#ffffff33" }
                    : { backgroundColor: `${color}26` }
                }
              >
                {tag.count}
              </span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <span className="px-1 py-1 text-xs text-foreground/40">
            No tags match.
          </span>
        )}
      </div>
    </div>
  );
}
