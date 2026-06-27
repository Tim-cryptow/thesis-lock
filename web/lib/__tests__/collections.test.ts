import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createCollection,
  addToCollection,
  removeFromCollection,
  moveItem,
  reorderItem,
  deleteCollection,
  getCollection,
  collectionsContaining,
  exportCollection,
  importCollection,
  loadCollections,
  totalItemCount,
  COLLECTION_ICONS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
} from "../collections";
import { installMemoryStorage } from "./memoryStorage";

const H1 = "a".repeat(64);
const H2 = "b".repeat(64);

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("createCollection", () => {
  it("starts with no collections", () => {
    expect(loadCollections()).toEqual([]);
  });

  it("trims fields and keeps a valid color and icon", () => {
    const c = createCollection("  Papers  ", "  My docs  ", "green", COLLECTION_ICONS[2]!);
    expect(c.name).toBe("Papers");
    expect(c.description).toBe("My docs");
    expect(c.color).toBe("green");
    expect(c.icon).toBe(COLLECTION_ICONS[2]!);
    expect(c.items).toEqual([]);
    expect(loadCollections()).toHaveLength(1);
  });

  it("falls back to defaults for an unknown color or icon", () => {
    const c = createCollection("X", "", "not-a-color", "not-an-icon");
    expect(c.color).toBe(DEFAULT_COLOR);
    expect(c.icon).toBe(DEFAULT_ICON);
  });
});

describe("items", () => {
  it("adds an item with a normalized hash", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, `0x${H1.toUpperCase()}`, "Label one");
    const items = getCollection(c.id)!.items;
    expect(items).toHaveLength(1);
    expect(items[0]!.hash).toBe(H1);
    expect(items[0]!.label).toBe("Label one");
  });

  it("does not duplicate a hash and backfills the note", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, H1, "Label one");
    addToCollection(c.id, H1, "Label one", "a note");
    const items = getCollection(c.id)!.items;
    expect(items).toHaveLength(1);
    expect(items[0]!.note).toBe("a note");
  });

  it("removes an item", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, H1, "x");
    removeFromCollection(c.id, H1);
    expect(getCollection(c.id)!.items).toEqual([]);
  });

  it("reports which collections contain a hash", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, H1, "x");
    expect(collectionsContaining(H1)).toEqual([c.id]);
    expect(collectionsContaining(H2)).toEqual([]);
  });

  it("reorders an item within a collection", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, H1, "first");
    addToCollection(c.id, H2, "second");
    // Newest first: [H2, H1]. Moving H1 up swaps it to the front.
    reorderItem(c.id, H1, "up");
    expect(getCollection(c.id)!.items.map((i) => i.hash)).toEqual([H1, H2]);
  });
});

describe("moveItem", () => {
  it("moves an item from one collection to another", () => {
    const a = createCollection("A", "", "blue", COLLECTION_ICONS[0]!);
    const b = createCollection("B", "", "green", COLLECTION_ICONS[1]!);
    addToCollection(a.id, H1, "x");
    moveItem(a.id, b.id, H1);
    expect(getCollection(a.id)!.items).toEqual([]);
    expect(getCollection(b.id)!.items.map((i) => i.hash)).toEqual([H1]);
  });

  it("removes from the source without duplicating when the destination already has the hash", () => {
    const a = createCollection("A", "", "blue", COLLECTION_ICONS[0]!);
    const b = createCollection("B", "", "green", COLLECTION_ICONS[1]!);
    addToCollection(a.id, H1, "x");
    addToCollection(b.id, H1, "y");
    moveItem(a.id, b.id, H1);
    expect(getCollection(a.id)!.items).toEqual([]);
    expect(getCollection(b.id)!.items.map((i) => i.hash)).toEqual([H1]);
  });
});

describe("deleteCollection / totalItemCount", () => {
  it("deletes a collection", () => {
    const c = createCollection("C", "", "blue", COLLECTION_ICONS[0]!);
    deleteCollection(c.id);
    expect(loadCollections()).toEqual([]);
  });

  it("totals items across collections", () => {
    const a = createCollection("A", "", "blue", COLLECTION_ICONS[0]!);
    const b = createCollection("B", "", "green", COLLECTION_ICONS[1]!);
    addToCollection(a.id, H1, "x");
    addToCollection(b.id, H2, "y");
    expect(totalItemCount(loadCollections())).toBe(2);
  });
});

describe("export / import", () => {
  it("exports a collection as parseable JSON", () => {
    const c = createCollection("C", "desc", "blue", COLLECTION_ICONS[0]!);
    addToCollection(c.id, H1, "x");
    const json = exportCollection(getCollection(c.id)!);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("C");
    expect(parsed.items[0].hash).toBe(H1);
  });

  it("round-trips through export then import with a fresh id", () => {
    const c = createCollection("Roundtrip", "desc", "green", COLLECTION_ICONS[2]!);
    addToCollection(c.id, H1, "one");
    addToCollection(c.id, H2, "two");
    const imported = importCollection(exportCollection(getCollection(c.id)!));
    expect(imported.id).not.toBe(c.id);
    expect(imported.name).toBe("Roundtrip");
    expect(imported.items.map((i) => i.hash).sort()).toEqual([H1, H2].sort());
    expect(loadCollections()).toHaveLength(2);
  });

  it("throws on input that is not a collection", () => {
    expect(() => importCollection("not json")).toThrow();
    expect(() => importCollection('{"foo":1}')).toThrow();
  });
});
