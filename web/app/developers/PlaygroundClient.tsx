"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EndpointSelector from "@/app/components/playground/EndpointSelector";
import ParameterForm from "@/app/components/playground/ParameterForm";
import CurlPreview from "@/app/components/playground/CurlPreview";
import ResponsePanel, { type PlaygroundResult } from "@/app/components/playground/ResponsePanel";
import RequestHistory, {
  clearHistory,
  loadHistory,
  pushHistory,
  type HistoryEntry,
} from "@/app/components/playground/RequestHistory";
import {
  ALL_ENDPOINTS,
  buildPath,
  findEndpoint,
  initialValues,
  isComplete,
  type Endpoint,
} from "@/app/components/playground/endpoints";

// Requests go to the current origin (a relative path) so the playground works
// without cross-origin CORS, while the curl preview still shows the canonical
// production URL.
async function runRequest(
  endpoint: Endpoint,
  values: Record<string, string>,
): Promise<PlaygroundResult> {
  const path = buildPath(endpoint, values);
  const start = performance.now();
  const response = await fetch(path, { headers: { Accept: "*/*" } });
  const durationMs = Math.round(performance.now() - start);

  const contentType = response.headers.get("content-type") ?? "";
  const cacheControl = response.headers.get("cache-control") ?? "";

  const base = {
    status: response.status,
    statusText: response.statusText,
    durationMs,
    contentType,
    cacheControl,
  };

  if (contentType.includes("application/json")) {
    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ...base, kind: "text", json: null, text };
    }
    return { ...base, kind: "json", json, text };
  }

  if (contentType.includes("svg")) {
    const text = await response.text();
    return { ...base, kind: "image", json: null, text };
  }

  if (contentType.startsWith("image/")) {
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    return { ...base, kind: "image", json: null, text: "", imageUrl };
  }

  const text = await response.text();
  return { ...base, kind: "text", json: null, text };
}

export default function PlaygroundClient() {
  const [endpoint, setEndpoint] = useState<Endpoint>(ALL_ENDPOINTS[0]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(ALL_ENDPOINTS[0]),
  );
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // sessionStorage is only available in the browser, so the history is loaded
  // after mount rather than during the initial (client-only) render.
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Object URLs created for image previews are revoked when they are replaced
  // or the component unmounts, so blobs do not leak across requests.
  const objectUrlRef = useRef<string | null>(null);
  const applyResult = useCallback((next: PlaygroundResult | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (next?.imageUrl) objectUrlRef.current = next.imageUrl;
    setResult(next);
  }, []);
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const send = useCallback(
    async (target: Endpoint, targetValues: Record<string, string>) => {
      if (!isComplete(target, targetValues)) return;
      setLoading(true);
      setError(null);
      applyResult(null);
      try {
        const next = await runRequest(target, targetValues);
        applyResult(next);
        setHistory(
          pushHistory({
            timestamp: Date.now(),
            method: target.method,
            endpointId: target.id,
            path: buildPath(target, targetValues),
            status: next.status,
            values: targetValues,
          }),
        );
      } catch {
        setError("Request failed. Check your connection and the parameters, then try again.");
      } finally {
        setLoading(false);
      }
    },
    [applyResult],
  );

  const selectEndpoint = useCallback((next: Endpoint) => {
    setEndpoint(next);
    setValues(initialValues(next));
  }, []);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Re-populates the form from a stored request and re-sends it. Falls back to
  // the stored endpoint definition by id so it survives endpoint renames.
  const replay = useCallback(
    (entry: HistoryEntry) => {
      const target = findEndpoint(entry.endpointId);
      if (!target) return;
      const restored = { ...initialValues(target), ...entry.values };
      setEndpoint(target);
      setValues(restored);
      void send(target, restored);
    },
    [send],
  );

  const onClear = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl">API Playground</h2>
        <p className="mt-1 text-sm text-foreground/70">Test API endpoints interactively.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-8">
        <aside>
          <EndpointSelector selectedId={endpoint.id} onSelect={selectEndpoint} />
        </aside>
        <section className="min-w-0 flex flex-col gap-6">
          <ParameterForm
            endpoint={endpoint}
            values={values}
            onChange={setValue}
            onSubmit={() => void send(endpoint, values)}
            loading={loading}
          />
          <CurlPreview endpoint={endpoint} values={values} />
          <ResponsePanel result={result} loading={loading} error={error} />
          <RequestHistory history={history} onReplay={replay} onClear={onClear} />
        </section>
      </div>
    </div>
  );
}
