import { describe, expect, it } from "vitest";
import { isEmbeddableRoute } from "../embeddableRoutes";

describe("isEmbeddableRoute", () => {
  it("matches the badge, card, nft, and profile-badge endpoints", () => {
    expect(isEmbeddableRoute("/api/badge/abc")).toBe(true);
    expect(isEmbeddableRoute("/api/card/abc")).toBe(true);
    expect(isEmbeddableRoute("/api/nft/1")).toBe(true);
    expect(isEmbeddableRoute("/api/profile-badge/SP123")).toBe(true);
    expect(isEmbeddableRoute("/api/status/badge")).toBe(true);
  });

  it("matches generated social and share images", () => {
    expect(isEmbeddableRoute("/opengraph-image")).toBe(true);
    expect(isEmbeddableRoute("/v/abc/share-image")).toBe(true);
  });

  it("does not relax framing for the status JSON or its history", () => {
    expect(isEmbeddableRoute("/api/status")).toBe(false);
    expect(isEmbeddableRoute("/api/status/history")).toBe(false);
  });

  it("does not relax framing for documents, including the embed builder page", () => {
    expect(isEmbeddableRoute("/")).toBe(false);
    expect(isEmbeddableRoute("/embed")).toBe(false);
    expect(isEmbeddableRoute("/anchor")).toBe(false);
    expect(isEmbeddableRoute("/api/verify/abc")).toBe(false);
  });
});
