"use client";

import { useState } from "react";
import ThemeToggle from "@/app/components/ThemeToggle";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import Footer from "@/app/components/Footer";
import HashMatcher from "@/app/components/HashMatcher";

type Mode = "hash-file" | "file-file";

export default function MatchClient() {
  const [mode, setMode] = useState<Mode>("hash-file");

  return (
    <div className="flex-1 w-full">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs />
          <ThemeToggle />
        </div>

        <h1 className="mb-2 text-3xl">Hash Matcher</h1>
        <p className="mb-8 text-foreground/70">
          Confirm two files are identical by comparing their SHA-256 hashes. Hashing
          happens entirely in your browser; the files never leave your device.
        </p>

        <div className="mb-6 flex items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-wide text-foreground/50">
            Mode
          </span>
          <button
            type="button"
            onClick={() => setMode("hash-file")}
            aria-pressed={mode === "hash-file"}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              mode === "hash-file"
                ? "border-foreground/40 bg-foreground/10"
                : "border-foreground/15 hover:border-foreground/40"
            }`}
          >
            Hash vs File
          </button>
          <button
            type="button"
            onClick={() => setMode("file-file")}
            aria-pressed={mode === "file-file"}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              mode === "file-file"
                ? "border-foreground/40 bg-foreground/10"
                : "border-foreground/15 hover:border-foreground/40"
            }`}
          >
            File vs File
          </button>
        </div>

        {mode === "hash-file" ? (
          <HashMatcher
            key="hash-file"
            leftMode="hash"
            rightMode="file"
            leftLabel="Original hash"
            rightLabel="Your file"
            showVerifyLink
          />
        ) : (
          <HashMatcher
            key="file-file"
            leftMode="file"
            rightMode="file"
            leftLabel="File A"
            rightLabel="File B"
            showVerifyLink
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
