"use client";

import { useCallback, useRef, useState } from "react";

type FileDropZoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  ariaLabel?: string;
  children?: React.ReactNode;
};

export default function FileDropZone({
  onFile,
  disabled = false,
  ariaLabel = "Choose a file, or drop one here",
  children,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const open = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-lg border-2 border-dashed p-12 text-center transition outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        dragOver
          ? "border-foreground/60 bg-foreground/5"
          : "border-foreground/20 hover:border-foreground/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so selecting the same file again still fires onChange.
          e.target.value = "";
        }}
      />
      {children ?? (
        <p className="text-foreground/60">
          Drop a file here, or click to choose one
        </p>
      )}
    </div>
  );
}
