"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import FileDropZone from "@/app/components/FileDropZone";
import { hashFile } from "@/lib/stacks";

const HEX_64 = /^[0-9a-f]{64}$/;
const SITE_FALLBACK = "https://thesis-lock.vercel.app";

type BadgeStyle = "flat" | "rounded";
type SnippetTab = "markdown" | "html" | "url" | "card";

const TABS: { id: SnippetTab; label: string }[] = [
  { id: "markdown", label: "Markdown" },
  { id: "html", label: "HTML" },
  { id: "url", label: "URL" },
  { id: "card", label: "HTML card" },
];

export default function EmbedClient() {
  const [origin, setOrigin] = useState(SITE_FALLBACK);
  const [hashInput, setHashInput] = useState("");
  const [style, setStyle] = useState<BadgeStyle>("flat");
  const [customLabel, setCustomLabel] = useState("");
  const [hashing, setHashing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const [tab, setTab] = useState<SnippetTab>("markdown");
  const [copied, setCopied] = useState<SnippetTab | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const hash = hashInput.trim().toLowerCase();
  const valid = HEX_64.test(hash);

  const badgeQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (style === "rounded") params.set("style", "rounded");
    if (customLabel.trim()) params.set("label", customLabel.trim());
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [style, customLabel]);

  const badgeUrl = valid ? `${origin}/api/badge/${hash}${badgeQuery}` : "";
  const cardUrl = valid ? `${origin}/api/card/${hash}` : "";
  const verifyUrl = valid ? `${origin}/v/${hash}` : "";

  const snippets: Record<SnippetTab, string> = useMemo(
    () => ({
      markdown: `![ThesisLock](${badgeUrl})`,
      html: `<img src="${badgeUrl}" alt="ThesisLock Verified" />`,
      url: badgeUrl,
      card: `<a href="${verifyUrl}"><img src="${cardUrl}" alt="ThesisLock verification card" /></a>`,
    }),
    [badgeUrl, cardUrl, verifyUrl],
  );

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setHashError(null);
    setHashing(true);
    try {
      const h = await hashFile(file);
      setHashInput(h);
    } catch (e) {
      setHashError(e instanceof Error ? e.message : "Could not hash this file.");
    } finally {
      setHashing(false);
    }
  };

  const copy = async (id: SnippetTab) => {
    const text = snippets[id];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setCopyFailed(false);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 1500);
    }
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
        <Link
          href="/search"
          className="text-foreground/60 hover:text-foreground"
        >
          Search
        </Link>
        <Link
          href="/anchor"
          className="text-foreground/60 hover:text-foreground"
        >
          Anchor
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          Feed
        </Link>
      </div>

      <h1 className="text-3xl mt-8 mb-2">Embed a verification badge</h1>
      <p className="text-foreground/70 mb-8">
        Paste a document hash or drop a file to generate an embeddable badge and
        social card. Add them to a website, README, or academic submission to
        prove a document is anchored on Stacks.
      </p>

      <div className="rounded-lg border border-foreground/10 bg-card p-6">
        <label
          htmlFor="hash-input"
          className="block text-xs text-foreground/60 uppercase tracking-wide mb-1"
        >
          Document hash (SHA-256)
        </label>
        <input
          id="hash-input"
          value={hashInput}
          onChange={(e) => setHashInput(e.target.value)}
          placeholder="64 hex characters"
          spellCheck={false}
          autoComplete="off"
          className="w-full font-mono text-sm rounded-md border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40"
        />
        {hashInput && !valid && (
          <p className="mt-2 text-sm text-foreground/60">
            Enter a valid 64-character hex hash, or drop a file below.
          </p>
        )}

        <div className="mt-4">
          <div className="text-xs text-foreground/60 uppercase tracking-wide mb-2">
            Or hash a file (it never leaves your device)
          </div>
          <FileDropZone
            onFile={(f) => void onFile(f)}
            ariaLabel="Choose a file to hash, or drop one here"
          >
            {hashing ? (
              <p className="text-foreground/60">Hashing...</p>
            ) : fileName ? (
              <p className="text-foreground/80 font-medium">{fileName}</p>
            ) : (
              <p className="text-foreground/60">
                Drop a file here, or click to choose one
              </p>
            )}
          </FileDropZone>
          {hashError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {hashError}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xl mb-4">Customize</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-xs text-foreground/60 uppercase tracking-wide mb-2">
              Style
            </div>
            <div className="flex gap-2">
              {(["flat", "rounded"] as BadgeStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  aria-pressed={style === s}
                  className={`text-sm px-3 py-2 rounded-md border transition ${
                    style === s
                      ? "border-foreground/40 bg-foreground/5"
                      : "border-foreground/15 hover:border-foreground/40"
                  }`}
                >
                  {s === "flat" ? "Flat" : "Rounded"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label
              htmlFor="label-input"
              className="block text-xs text-foreground/60 uppercase tracking-wide mb-2"
            >
              Left label (optional)
            </label>
            <input
              id="label-input"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="ThesisLock"
              maxLength={60}
              className="w-full text-sm rounded-md border border-foreground/15 bg-transparent px-3 py-2 outline-none focus:border-foreground/40"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xl mb-4">Preview</h2>
        {valid ? (
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-2">
                Badge
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={badgeUrl}
                alt="ThesisLock verification badge preview"
                height={20}
              />
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-2">
                Social card
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardUrl}
                alt="ThesisLock verification card preview"
                width={600}
                height={300}
                className="max-w-full h-auto rounded-md border border-foreground/10"
              />
            </div>
          </div>
        ) : (
          <p className="text-foreground/60 text-sm">
            Enter a hash or drop a file above to see the live preview.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xl mb-4">Copy a snippet</h2>
        <div className="flex flex-wrap gap-2 mb-4" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-3 py-2 rounded-md border transition ${
                tab === t.id
                  ? "border-foreground/40 bg-foreground/5"
                  : "border-foreground/15 hover:border-foreground/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <pre className="text-xs md:text-sm font-mono whitespace-pre-wrap break-all rounded-md border border-foreground/10 bg-foreground/5 p-3">
          {valid ? snippets[tab] : "Enter a valid hash to generate snippets."}
        </pre>
        <button
          onClick={() => void copy(tab)}
          disabled={!valid}
          className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
        >
          {copied === tab
            ? "Copied"
            : copyFailed
              ? "Copy failed"
              : "Copy snippet"}
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xl mb-2">Badge states</h2>
        <p className="text-foreground/70 text-sm mb-4">
          The badge color reflects the on-chain status of the hash.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <ExampleBadge verified />
            <span className="text-xs text-foreground/60">Anchored</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ExampleBadge verified={false} />
            <span className="text-xs text-foreground/60">Not anchored</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExampleBadge({ verified }: { verified: boolean }) {
  const message = verified ? "Verified ✓ #198432" : "Not Verified";
  const color = verified ? "#4c1" : "#9f9f9f";
  return (
    <span
      className="inline-flex text-xs font-sans overflow-hidden rounded"
      style={{ height: 20 }}
    >
      <span
        className="flex items-center px-2 text-white"
        style={{ background: "#555" }}
      >
        ThesisLock
      </span>
      <span
        className="flex items-center px-2 text-white"
        style={{ background: color }}
      >
        {message}
      </span>
    </span>
  );
}
