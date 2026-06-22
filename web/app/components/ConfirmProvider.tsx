"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "./ConfirmDialog";
import {
  ConfirmContext,
  type ConfirmContextValue,
  type ConfirmOptions,
} from "./useConfirm";

type Pending = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

// Holds the single confirmation dialog for the whole app. It exposes a promise
// based confirm() through context and renders the dialog into a portal on the
// document body, so any component can request a confirmation without rendering
// or wiring up a dialog of its own.
export default function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ options, resolve });
      }),
    [],
  );

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {mounted && pending
        ? createPortal(
            <ConfirmDialog
              open
              title={pending.options.title}
              message={pending.options.message}
              confirmLabel={pending.options.confirmLabel ?? "Confirm"}
              cancelLabel={pending.options.cancelLabel ?? "Cancel"}
              variant={pending.options.variant ?? "info"}
              requireType={pending.options.requireType}
              onConfirm={() => {
                pending.resolve(true);
                setPending(null);
              }}
              onCancel={() => {
                pending.resolve(false);
                setPending(null);
              }}
            />,
            document.body,
          )
        : null}
    </ConfirmContext.Provider>
  );
}
