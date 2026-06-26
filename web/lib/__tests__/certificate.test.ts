import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateCertificate, type CertificateData } from "../certificate";
import { installMemoryStorage } from "./memoryStorage";

const BASE: CertificateData = {
  hash: "a".repeat(64),
  label: "thesis-chapter-3",
  owner: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
  stacksBlock: 123456,
  burnBlock: 870000,
  timestamp: "2026-06-26T00:00:00.000Z",
  contractName: "thesislock",
  verifyUrl: "https://thesis-lock.vercel.app/v/" + "a".repeat(64),
};

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("generateCertificate", () => {
  it("returns an HTML document", () => {
    expect(generateCertificate(BASE).startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("includes the document hash", () => {
    expect(generateCertificate(BASE)).toContain(BASE.hash);
  });

  it("includes the label", () => {
    expect(generateCertificate(BASE)).toContain("thesis-chapter-3");
  });

  it("shows (none) when the label is empty", () => {
    expect(generateCertificate({ ...BASE, label: "" })).toContain("(none)");
  });

  it("includes the owner principal", () => {
    expect(generateCertificate(BASE)).toContain(BASE.owner);
  });

  it("includes the Stacks and Bitcoin block numbers", () => {
    const html = generateCertificate(BASE);
    expect(html).toContain("123456");
    expect(html).toContain("870000");
  });

  it("includes the verify URL", () => {
    expect(generateCertificate(BASE)).toContain(BASE.verifyUrl);
  });

  it("escapes HTML in the label to prevent injection", () => {
    const html = generateCertificate({
      ...BASE,
      label: "<script>alert('x')</script>",
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert('x')</script>");
  });
});
