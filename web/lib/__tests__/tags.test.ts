import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addTag,
  removeTag,
  getTagsForHash,
  setTagsForHash,
  getAllTags,
  getHashesByTag,
  renameTag,
  deleteTag,
  mergeTags,
  normalizeTag,
  suggestTags,
  MAX_TAGS_PER_ANCHOR,
} from "../tags";
import { installMemoryStorage } from "./memoryStorage";

const H1 = "a".repeat(64);
const H2 = "b".repeat(64);

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("normalizeTag", () => {
  it("lowercases, slugifies spaces, and drops punctuation", () => {
    expect(normalizeTag("  My Tag! ")).toBe("my-tag");
  });

  it("caps the tag length at 30 characters", () => {
    expect(normalizeTag("x".repeat(50))).toHaveLength(30);
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(normalizeTag("!!!")).toBe("");
  });
});

describe("addTag / getTagsForHash", () => {
  it("returns no tags for an untagged hash", () => {
    expect(getTagsForHash(H1)).toEqual([]);
  });

  it("adds a normalized tag", () => {
    addTag(H1, "Academic");
    expect(getTagsForHash(H1)).toEqual(["academic"]);
  });

  it("does not add the same tag twice", () => {
    addTag(H1, "academic");
    addTag(H1, "academic");
    expect(getTagsForHash(H1)).toEqual(["academic"]);
  });

  it("ignores an unusable tag", () => {
    addTag(H1, "###");
    expect(getTagsForHash(H1)).toEqual([]);
  });

  it("matches the same document across 0x prefix and casing", () => {
    addTag(`0x${H1.toUpperCase()}`, "research");
    expect(getTagsForHash(H1)).toEqual(["research"]);
  });

  it("caps the number of tags per anchor", () => {
    for (let i = 0; i < MAX_TAGS_PER_ANCHOR + 3; i += 1) addTag(H1, `tag-${i}`);
    expect(getTagsForHash(H1)).toHaveLength(MAX_TAGS_PER_ANCHOR);
  });
});

describe("removeTag / setTagsForHash", () => {
  it("removes a tag", () => {
    setTagsForHash(H1, ["academic", "research"]);
    removeTag(H1, "academic");
    expect(getTagsForHash(H1)).toEqual(["research"]);
  });

  it("replaces the full set, de-duplicating and normalizing", () => {
    setTagsForHash(H1, ["Academic", "academic", "Research"]);
    expect(getTagsForHash(H1)).toEqual(["academic", "research"]);
  });

  it("removing the last tag drops the anchor entry", () => {
    setTagsForHash(H1, ["solo"]);
    removeTag(H1, "solo");
    expect(getTagsForHash(H1)).toEqual([]);
    expect(getAllTags()).toEqual([]);
  });
});

describe("getAllTags / getHashesByTag", () => {
  it("counts distinct tags and sorts by count then name", () => {
    setTagsForHash(H1, ["shared", "alpha"]);
    setTagsForHash(H2, ["shared"]);
    const all = getAllTags();
    expect(all.map((t) => t.name)).toEqual(["shared", "alpha"]);
    expect(all[0].count).toBe(2);
    expect(all[1].count).toBe(1);
  });

  it("lists the hashes carrying a tag", () => {
    setTagsForHash(H1, ["shared"]);
    setTagsForHash(H2, ["shared"]);
    expect(getHashesByTag("shared").sort()).toEqual([H1, H2].sort());
  });
});

describe("renameTag / deleteTag / mergeTags", () => {
  it("renames a tag across every anchor", () => {
    setTagsForHash(H1, ["old"]);
    setTagsForHash(H2, ["old"]);
    renameTag("old", "new");
    expect(getTagsForHash(H1)).toEqual(["new"]);
    expect(getTagsForHash(H2)).toEqual(["new"]);
  });

  it("deletes a tag from every anchor", () => {
    setTagsForHash(H1, ["keep", "drop"]);
    setTagsForHash(H2, ["drop"]);
    deleteTag("drop");
    expect(getTagsForHash(H1)).toEqual(["keep"]);
    expect(getTagsForHash(H2)).toEqual([]);
  });

  it("merges a source tag into a target tag", () => {
    setTagsForHash(H1, ["source"]);
    setTagsForHash(H2, ["source", "target"]);
    mergeTags("source", "target");
    expect(getTagsForHash(H1)).toEqual(["target"]);
    expect(getTagsForHash(H2)).toEqual(["target"]);
  });
});

describe("suggestTags", () => {
  it("suggests template tags from a structured label prefix", () => {
    expect(suggestTags("paper-title:thesis|v:2")).toEqual([
      "academic",
      "research",
    ]);
  });

  it("suggests workflow keywords found in the label text", () => {
    expect(suggestTags("draft chapter")).toContain("draft");
  });

  it("returns nothing for a label with no signals", () => {
    expect(suggestTags("untitled")).toEqual([]);
  });
});
