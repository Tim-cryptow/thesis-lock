import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatAnchorsCSV, formatAnchorsJSON, formatBulkVerifyCSV } from "../export";
import { installMemoryStorage } from "./memoryStorage";

const H1 = "a".repeat(64);
const H2 = "b".repeat(64);
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("formatAnchorsCSV", () => {
  it("emits the expected header row", () => {
    const header = formatAnchorsCSV([], OWNER).split("\r\n")[0];
    expect(header).toBe("Hash,Label,Stacks Block,Owner,Verify URL");
  });

  it("emits only the header for an empty list", () => {
    expect(formatAnchorsCSV([], OWNER).split("\r\n")).toHaveLength(1);
  });

  it("writes a data row with the anchor fields and verify URL", () => {
    const row = formatAnchorsCSV([{ hash: H1, label: "My Doc", anchoredAt: 1000 }], OWNER).split(
      "\r\n",
    )[1];
    expect(row).toContain(H1);
    expect(row).toContain("My Doc");
    expect(row).toContain("1000");
    expect(row).toContain(`/v/${H1}?owner=`);
  });

  it("quotes a label containing a comma", () => {
    const row = formatAnchorsCSV([{ hash: H1, label: "Doc, final", anchoredAt: 1 }], OWNER).split(
      "\r\n",
    )[1];
    expect(row).toContain('"Doc, final"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const row = formatAnchorsCSV([{ hash: H1, label: 'He said "hi"', anchoredAt: 1 }], OWNER).split(
      "\r\n",
    )[1];
    expect(row).toContain('""hi""');
  });
});

describe("formatAnchorsJSON", () => {
  it("produces valid JSON with the expected fields", () => {
    const parsed = JSON.parse(
      formatAnchorsJSON([{ hash: H1, label: "Doc", anchoredAt: 1000 }], OWNER),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].hash).toBe(H1);
    expect(parsed[0].label).toBe("Doc");
    expect(parsed[0].stacksBlock).toBe(1000);
    expect(parsed[0].owner).toBe(OWNER);
    expect(parsed[0].verifyUrl).toContain(`/v/${H1}`);
    expect(typeof parsed[0].exportedAt).toBe("string");
  });

  it("serializes multiple anchors", () => {
    const parsed = JSON.parse(
      formatAnchorsJSON(
        [
          { hash: H1, label: "A", anchoredAt: 1 },
          { hash: H2, label: "B", anchoredAt: 2 },
        ],
        OWNER,
      ),
    );
    expect(parsed.map((p: { hash: string }) => p.hash)).toEqual([H1, H2]);
  });
});

describe("formatBulkVerifyCSV", () => {
  it("emits the expected header row", () => {
    const header = formatBulkVerifyCSV([]).split("\r\n")[0];
    expect(header).toBe("Filename,Full Hash,Status,Source,Block");
  });

  it("writes empty cells for null hash and block", () => {
    const row = formatBulkVerifyCSV([
      { filename: "a.pdf", hash: null, status: "not found", source: null, block: null },
    ]).split("\r\n")[1];
    expect(row).toBe("a.pdf,,not found,,");
  });

  it("writes hash, source, and block when present", () => {
    const row = formatBulkVerifyCSV([
      { filename: "a.pdf", hash: H1, status: "verified", source: "single", block: 42 },
    ]).split("\r\n")[1];
    expect(row).toBe(`a.pdf,${H1},verified,single,42`);
  });
});
