"use client";

import { createContext, useContext } from "react";
import type { ConfirmVariant } from "./ConfirmDialog";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  // When set, the user must type this exact word before confirming.
  requireType?: string;
};

export type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// Promise-based confirmation. Any component under the ConfirmProvider can call
// `const confirm = useConfirm()` and then `await confirm({ title, message })`,
// which resolves true when the user confirms and false when they cancel. This
// avoids prop drilling a dialog and its open/close state through the tree.
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}
