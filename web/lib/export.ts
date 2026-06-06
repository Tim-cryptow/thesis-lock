import type { RegistryEntry } from "./stacks";

function originBase(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function verifyUrlFor(hash: string, owner: string): string {
  return `${originBase()}/v/${hash}?owner=${encodeURIComponent(owner)}`;
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatAnchorsCSV(
  anchors: RegistryEntry[],
  owner: string,
): string {
  const header = ["Hash", "Label", "Stacks Block", "Owner", "Verify URL"];
  const rows = anchors.map((a) =>
    [a.hash, a.label, String(a.anchoredAt), owner, verifyUrlFor(a.hash, owner)]
      .map(escapeCsv)
      .join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}

export function formatAnchorsJSON(
  anchors: RegistryEntry[],
  owner: string,
): string {
  const exportedAt = new Date().toISOString();
  const items = anchors.map((a) => ({
    hash: a.hash,
    label: a.label,
    stacksBlock: a.anchoredAt,
    owner,
    verifyUrl: verifyUrlFor(a.hash, owner),
    exportedAt,
  }));
  return JSON.stringify(items, null, 2);
}

export function downloadExport(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
