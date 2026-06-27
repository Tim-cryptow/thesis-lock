"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  WEBHOOK_EVENTS,
  generateSignature,
  sampleEventData,
  type WebhookSubscription,
} from "@/lib/webhookManager";
import CopyButton from "@/app/components/CopyButton";

type TestResult = {
  at: string;
  event: string;
  ok: boolean;
  status: number | null;
  timeMs: number;
  bodyPreview: string;
  corsBlocked: boolean;
};

export default function WebhookTester({
  subscriptions,
  focusId,
}: {
  subscriptions: WebhookSubscription[];
  focusId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [eventType, setEventType] = useState<string>(WEBHOOK_EVENTS[0].id);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);

  // Default the selection to the focused subscription, then any first one.
  useEffect(() => {
    if (focusId) {
      setSelectedId(focusId);
    } else if (subscriptions.length > 0) {
      setSelectedId((cur) => (subscriptions.some((s) => s.id === cur) ? cur : subscriptions[0].id));
    }
  }, [focusId, subscriptions]);

  const selected = subscriptions.find((s) => s.id === selectedId) ?? null;

  const { body, signature, curl } = useMemo(() => {
    const bodyObj = {
      event: eventType,
      data: sampleEventData(eventType),
      timestamp: new Date().toISOString(),
    };
    // One exact string is displayed, signed, sent, and shown in curl, so a
    // copied body plus the signature header verifies (whitespace is part of the
    // signed bytes).
    const text = JSON.stringify(bodyObj, null, 2);
    const sig = selected?.secret ? generateSignature(text, selected.secret) : "";
    const url = selected?.url ?? "https://example.com/webhook";
    const curlCmd = [
      `curl -X POST '${url}' \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'X-ThesisLock-Event: ${eventType}' \\`,
      `  -H 'X-ThesisLock-Signature: sha256=${sig}' \\`,
      `  --data-binary '${text}'`,
    ].join("\n");
    return { body: text, signature: sig, curl: curlCmd };
  }, [eventType, selected]);

  const send = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    const record = (partial: Omit<TestResult, "at" | "event" | "timeMs">) => {
      const timeMs = Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - start,
      );
      setHistory((cur) =>
        [
          {
            at: new Date().toISOString(),
            event: eventType,
            timeMs,
            ...partial,
          },
          ...cur,
        ].slice(0, 5),
      );
    };
    try {
      const res = await fetch(selected.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ThesisLock-Event": eventType,
          "X-ThesisLock-Signature": `sha256=${signature}`,
        },
        body,
      });
      let text = "";
      try {
        text = await res.text();
      } catch {
        text = "";
      }
      record({
        ok: res.ok,
        status: res.status,
        bodyPreview: text.slice(0, 300),
        corsBlocked: false,
      });
    } catch {
      // A thrown fetch in the browser is almost always a CORS or network
      // failure; the request may still have reached the server.
      record({
        ok: false,
        status: null,
        bodyPreview: "",
        corsBlocked: true,
      });
    } finally {
      setSending(false);
    }
  }, [selected, eventType, body, signature]);

  return (
    <div>
      <h3 className="text-lg font-medium">Test a webhook</h3>
      <p className="mt-1 text-sm text-foreground/70">
        Send a sample payload to a subscription endpoint from your browser. If the endpoint does not
        allow cross-origin requests, use the curl command instead.
      </p>

      {subscriptions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-foreground/15 px-6 py-8 text-center text-sm text-foreground/60">
          Create a subscription above to test it.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Subscription
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              >
                {subscriptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.url}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Event
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
              >
                {WEBHOOK_EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-sm font-medium">Request body</div>
            <pre className="overflow-x-auto rounded-md border border-foreground/10 bg-foreground/5 p-3 text-xs">
              <code>{body}</code>
            </pre>
            <p className="mt-1 text-xs text-foreground/50 break-all">
              Header: X-ThesisLock-Signature: sha256={signature}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={sending || !selected}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send test"}
            </button>
          </div>

          {history.length > 0 ? (
            <div className="mt-6">
              <div className="mb-2 text-sm font-medium">Recent tests</div>
              {history[0].corsBlocked ? (
                <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    The browser could not complete the request (likely CORS). Run this from your
                    server or terminal instead:
                  </p>
                  <div className="mt-2 flex items-stretch gap-2">
                    <pre className="min-w-0 flex-1 overflow-x-auto rounded-md border border-foreground/15 bg-background p-2 text-xs">
                      <code>{curl}</code>
                    </pre>
                    <CopyButton value={curl} />
                  </div>
                </div>
              ) : null}
              <ul className="flex flex-col gap-2">
                {history.map((r, i) => (
                  <li key={i} className="rounded-md border border-foreground/10 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            r.ok ? "bg-emerald-500" : r.corsBlocked ? "bg-amber-500" : "bg-red-500"
                          }`}
                        />
                        <code className="text-xs">{r.event}</code>
                        <span className="text-xs text-foreground/60">
                          {r.corsBlocked
                            ? "blocked"
                            : r.status !== null
                              ? `HTTP ${r.status}`
                              : "error"}
                        </span>
                      </span>
                      <span className="text-xs text-foreground/50 tabular-nums">
                        {r.timeMs} ms · {new Date(r.at).toLocaleTimeString()}
                      </span>
                    </div>
                    {r.bodyPreview ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-foreground/5 p-2 text-xs">
                        <code>{r.bodyPreview}</code>
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
