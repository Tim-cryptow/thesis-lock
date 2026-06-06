import { ThesisLockClient } from "./client";
import type { ThesisLockConfig } from "./types";

export * from "./types";
export * from "./utils";
export { ThesisLockClient } from "./client";

/** Convenience factory for a ThesisLockClient. */
export function createClient(config?: ThesisLockConfig): ThesisLockClient {
  return new ThesisLockClient(config);
}
