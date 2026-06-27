import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TEMPLATES,
  getTemplate,
  buildLabel,
  buildRawLabel,
  parseLabel,
  templateFieldError,
  isTemplateValid,
  MAX_LABEL_LENGTH,
  GENERIC_TEMPLATE_ID,
} from "../templates";
import { installMemoryStorage } from "./memoryStorage";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

const paper = getTemplate("paper")!;

describe("getTemplate", () => {
  it("resolves every template by id", () => {
    for (const tpl of TEMPLATES) {
      expect(getTemplate(tpl.id)?.id).toBe(tpl.id);
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(getTemplate("nope")).toBeUndefined();
  });
});

describe("buildLabel", () => {
  it("encodes a structured label with prefix and fields", () => {
    expect(buildLabel(paper, { title: "thesis", v: "2" })).toBe("paper-title:thesis|v:2");
  });

  it("skips empty fields", () => {
    expect(buildLabel(paper, { title: "thesis", v: "", dept: "" })).toBe("paper-title:thesis");
  });

  it("returns the raw value for the generic template", () => {
    const generic = getTemplate(GENERIC_TEMPLATE_ID)!;
    expect(buildLabel(generic, { label: "free form text" })).toBe("free form text");
  });

  it("truncates to the maximum on-chain label length", () => {
    const built = buildLabel(paper, { title: "x".repeat(100) });
    expect(built.length).toBe(MAX_LABEL_LENGTH);
  });

  it("buildRawLabel is not truncated", () => {
    expect(buildRawLabel(paper, { title: "x".repeat(100) }).length).toBeGreaterThan(
      MAX_LABEL_LENGTH,
    );
  });
});

describe("parseLabel", () => {
  it("round-trips a built label back to its template and fields", () => {
    const label = buildLabel(paper, { title: "thesis", v: "2" });
    const parsed = parseLabel(label);
    expect(parsed.templateId).toBe("paper");
    expect(parsed.fields).toEqual({ title: "thesis", v: "2" });
  });

  it("round-trips every non-generic template", () => {
    for (const tpl of TEMPLATES) {
      if (tpl.id === GENERIC_TEMPLATE_ID) continue;
      const firstKey = tpl.fields[0].key;
      const parsed = parseLabel(buildLabel(tpl, { [firstKey]: "sample" }));
      expect(parsed.templateId).toBe(tpl.id);
      expect(parsed.fields[firstKey]).toBe("sample");
    }
  });

  it("falls back to a raw label for an unknown prefix", () => {
    const parsed = parseLabel("unknown-foo:bar");
    expect(parsed.templateId).toBeUndefined();
    expect(parsed.fields).toEqual({ label: "unknown-foo:bar" });
  });

  it("does not treat a prefix-only label without a separator as structured", () => {
    const parsed = parseLabel("paper-thesis");
    expect(parsed.templateId).toBeUndefined();
  });

  it("returns the empty label as a raw field", () => {
    expect(parseLabel("")).toEqual({ fields: { label: "" } });
  });
});

describe("templateFieldError / isTemplateValid", () => {
  const titleField = paper.fields[0];

  it("flags non-ASCII values", () => {
    expect(templateFieldError(titleField, "café")).toBe("asciiOnly");
  });

  it("flags a missing required value", () => {
    expect(templateFieldError(titleField, "")).toBe("required");
  });

  it("accepts a valid value", () => {
    expect(templateFieldError(titleField, "thesis")).toBeNull();
  });

  it("validates a whole template", () => {
    expect(isTemplateValid(paper, { title: "thesis" })).toBe(true);
    expect(isTemplateValid(paper, {})).toBe(false);
  });
});
