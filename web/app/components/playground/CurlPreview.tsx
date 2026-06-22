"use client";

import { buildUrl, type Endpoint } from "./endpoints";
import CopyButton from "@/app/components/CopyButton";

type Props = {
  endpoint: Endpoint;
  values: Record<string, string>;
};

// Single-quote the URL for the shell and escape any embedded single quotes,
// so labels or queries containing shell metacharacters stay safe to paste.
function curlCommand(endpoint: Endpoint, values: Record<string, string>): string {
  const url = buildUrl(endpoint, values).replace(/'/g, "'\\''");
  return `curl -s '${url}'`;
}

export default function CurlPreview({ endpoint, values }: Props) {
  const command = curlCommand(endpoint, values);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-foreground/40">
          curl
        </h2>
        <CopyButton value={command} label="curl command" />
      </div>
      <pre className="overflow-x-auto rounded-md bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
        <code className="font-mono">{command}</code>
      </pre>
    </div>
  );
}
