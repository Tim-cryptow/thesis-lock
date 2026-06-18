import type { HashInput } from "./report";

// sessionStorage key the report builder reads on mount to pre-populate its hash
// list. Pages stage a list here right before navigating to /report so filenames
// and large sets survive the hop without bloating the URL.
export const REPORT_INPUT_KEY = "thesislock_report_input";

export function stageReportInput(items: HashInput[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REPORT_INPUT_KEY, JSON.stringify(items));
  } catch {
    // Best-effort; the report page still loads, just without a pre-filled list.
  }
}
