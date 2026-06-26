import chalk from "chalk";

// Matches CSI color sequences like ESC[32m. Built from a char code so the
// source carries no literal control character.
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Remove ANSI color escapes so captured or piped output stays clean. */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, "");
}

/** Pretty-printed JSON for the --json output mode. */
export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** A bold label followed by its value, e.g. "Hash: abc123". */
export function field(label: string, value: string): string {
  return `${chalk.bold(`${label}:`)} ${value}`;
}

/** An error as red text, or a JSON object when the caller is in --json mode. */
export function formatError(message: string, json = false): string {
  return json ? toJson({ error: message }) : chalk.red(message);
}

/** Human-readable byte size in B, KB, or MB. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
