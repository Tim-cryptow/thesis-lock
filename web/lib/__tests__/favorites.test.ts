import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  toggleFavorite,
  favoriteHref,
} from "../favorites";
import { installMemoryStorage } from "./memoryStorage";

const H1 = "a".repeat(64);
const WALLET = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("loadFavorites", () => {
  it("returns an empty list with no stored favorites", () => {
    expect(loadFavorites()).toEqual([]);
  });
});

describe("addFavorite", () => {
  it("adds a favorite with a normalized hash value", () => {
    const fav = addFavorite("hash", `0x${H1.toUpperCase()}`, "My doc");
    expect(fav.value).toBe(H1);
    expect(fav.label).toBe("My doc");
    expect(loadFavorites()).toHaveLength(1);
  });

  it("uppercases a wallet value", () => {
    const fav = addFavorite("wallet", WALLET.toLowerCase(), "Me");
    expect(fav.value).toBe(WALLET);
  });

  it("returns the existing favorite instead of adding a duplicate", () => {
    const first = addFavorite("hash", H1, "A");
    const second = addFavorite("hash", H1, "B");
    expect(second.id).toBe(first.id);
    expect(loadFavorites()).toHaveLength(1);
  });

  it("derives a default label when none is given", () => {
    const fav = addFavorite("hash", H1, "");
    expect(fav.label.length).toBeGreaterThan(0);
  });
});

describe("isFavorite", () => {
  it("is true after adding and false otherwise", () => {
    expect(isFavorite("hash", H1)).toBe(false);
    addFavorite("hash", H1, "x");
    expect(isFavorite("hash", H1)).toBe(true);
  });

  it("matches a wallet regardless of casing", () => {
    addFavorite("wallet", WALLET, "Me");
    expect(isFavorite("wallet", WALLET.toLowerCase())).toBe(true);
  });
});

describe("removeFavorite", () => {
  it("removes a favorite by id", () => {
    const fav = addFavorite("hash", H1, "x");
    removeFavorite(fav.id);
    expect(loadFavorites()).toEqual([]);
  });
});

describe("toggleFavorite", () => {
  it("adds when absent and reports the new state", () => {
    expect(toggleFavorite("hash", H1, "x")).toBe(true);
    expect(isFavorite("hash", H1)).toBe(true);
  });

  it("removes when present and reports the new state", () => {
    addFavorite("hash", H1, "x");
    expect(toggleFavorite("hash", H1, "x")).toBe(false);
    expect(isFavorite("hash", H1)).toBe(false);
  });
});

describe("favoriteHref", () => {
  it("builds the in-app destination per type", () => {
    expect(favoriteHref(addFavorite("hash", H1, "x"))).toBe(`/v/${H1}`);
    expect(favoriteHref(addFavorite("wallet", WALLET, "x"))).toBe(`/u/${WALLET}`);
    expect(favoriteHref(addFavorite("group", "5", "x"))).toBe("/groups/5");
    expect(favoriteHref(addFavorite("page", "stats", "x"))).toBe("/stats");
  });
});
