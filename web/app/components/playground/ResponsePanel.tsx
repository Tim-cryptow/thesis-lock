"use client";

import { Fragment, type ReactNode } from "react";

// Result of a single playground request, built by PlaygroundClient and rendered
// here. `kind` decides how the body is shown: parsed JSON gets the syntax
// highlighter, an image content type renders inline, anything else is plain
// text.
export type PlaygroundResult = {
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  cacheControl: string;
  kind: "json" | "image" | "text";
  // Parsed value for `json`, ignored otherwise.
  json: unknown;
  // Raw response text for `text` and the SVG markup for inline `image`.
  text: string;
  // Object URL for non-SVG image responses.
  imageUrl?: string;
};

type Props = {
  result: PlaygroundResult | null;
  loading: boolean;
  error: string | null;
};

function statusColor(status: number): string {
  if (status >= 500) return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (status >= 400) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status >= 200 && status < 300)
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return "bg-foreground/10 text-foreground/70";
}

// Recursive JSON renderer with color-coded value types. Indentation is built
// with non-breaking spaces so it survives inside the <pre> without collapsing.
function JsonValue({ value, indent }: { value: unknown; indent: number }): ReactNode {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  if (value === null) {
    return <span className="text-zinc-500">null</span>;
  }
  if (typeof value === "string") {
    return <span className="text-emerald-400">{JSON.stringify(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-sky-400">{String(value)}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-orange-400">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-300">[]</span>;
    return (
      <>
        <span className="text-zinc-300">[</span>
        {"\n"}
        {value.map((item, index) => (
          <Fragment key={index}>
            {padInner}
            <JsonValue value={item} indent={indent + 1} />
            {index < value.length - 1 ? <span className="text-zinc-300">,</span> : null}
            {"\n"}
          </Fragment>
        ))}
        {pad}
        <span className="text-zinc-300">]</span>
      </>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-zinc-300">{"{}"}</span>;
    return (
      <>
        <span className="text-zinc-300">{"{"}</span>
        {"\n"}
        {entries.map(([key, val], index) => (
          <Fragment key={key}>
            {padInner}
            <span className="text-zinc-100">{JSON.stringify(key)}</span>
            <span className="text-zinc-300">: </span>
            <JsonValue value={val} indent={indent + 1} />
            {index < entries.length - 1 ? <span className="text-zinc-300">,</span> : null}
            {"\n"}
          </Fragment>
        ))}
        {pad}
        <span className="text-zinc-300">{"}"}</span>
      </>
    );
  }

  return <span className="text-zinc-300">{String(value)}</span>;
}

// Inline preview for image responses. SVG markup is rendered directly (the
// markup comes from our own API, not user input); other image types are shown
// through their object URL.
function ImagePreview({ result }: { result: PlaygroundResult }) {
  const isSvg = result.contentType.includes("svg");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center rounded-md border border-foreground/10 bg-[repeating-conic-gradient(#0001_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-6">
        {isSvg ? (
          <span
            className="inline-block"
            // The SVG is produced by the ThesisLock badge API, not user input.
            dangerouslySetInnerHTML={{ __html: result.text }}
          />
        ) : result.imageUrl ? (
          <img src={result.imageUrl} alt="API image response preview" className="max-w-full" />
        ) : (
          <span className="text-sm text-foreground/50">No preview available.</span>
        )}
      </div>
      {isSvg ? (
        <pre className="overflow-x-auto rounded-md bg-zinc-900 px-4 py-3 text-xs text-zinc-100">
          <code className="font-mono whitespace-pre-wrap break-all">{result.text}</code>
        </pre>
      ) : null}
    </div>
  );
}

function HeaderRow({ name, value }: { name: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-mono text-foreground/50">{name}:</span>
      <span className="font-mono text-foreground/80 break-all">{value}</span>
    </div>
  );
}

export default function ResponsePanel({ result, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-foreground/10 px-4 py-8 text-sm text-foreground/60">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground"
          aria-hidden="true"
        />
        Sending request...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!result) {
    return (
      <p className="rounded-md border border-dashed border-foreground/15 px-4 py-8 text-center text-sm text-foreground/50">
        Send a request to see the response here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded px-2 py-0.5 text-sm font-mono font-medium ${statusColor(
            result.status,
          )}`}
        >
          {result.status} {result.statusText}
        </span>
        <span className="text-xs text-foreground/50">{result.durationMs} ms</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <HeaderRow name="content-type" value={result.contentType} />
        <HeaderRow name="cache-control" value={result.cacheControl} />
      </div>

      {result.kind === "json" ? (
        <pre className="overflow-x-auto rounded-md bg-zinc-900 px-4 py-3 text-sm leading-relaxed">
          <code className="font-mono">
            <JsonValue value={result.json} indent={0} />
          </code>
        </pre>
      ) : result.kind === "image" ? (
        <ImagePreview result={result} />
      ) : (
        <pre className="overflow-x-auto rounded-md bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
          <code className="font-mono whitespace-pre-wrap break-all">{result.text}</code>
        </pre>
      )}
    </div>
  );
}
