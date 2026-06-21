"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WebhookTester from "./WebhookTester";
import {
  WEBHOOK_EVENTS,
  createSubscription,
  deleteSubscription,
  formatWebhookPayload,
  loadSubscriptions,
  sampleEventData,
  toggleSubscription,
  type WebhookSubscription,
} from "@/lib/webhookManager";

const NODE_SNIPPET = `import crypto from "node:crypto";

// Verify the X-ThesisLock-Signature header against the raw request body.
function verify(rawBody, signatureHeader, secret) {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected),
  );
}`;

const PYTHON_SNIPPET = `import hmac, hashlib

# Verify the X-ThesisLock-Signature header against the raw request body.
def verify(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected)`;

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-md border border-foreground/15 px-3 py-2 text-sm hover:border-foreground/40"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function truncateUrl(url: string): string {
  return url.length > 44 ? `${url.slice(0, 30)}...${url.slice(-10)}` : url;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function WebhooksClient() {
  const [subs, setSubs] = useState<WebhookSubscription[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [testFocusId, setTestFocusId] = useState<string | null>(null);
  const testerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubs(loadSubscriptions());
  }, []);

  const refresh = useCallback(() => setSubs(loadSubscriptions()), []);

  const allSelected = selected.length === WEBHOOK_EVENTS.length;
  const toggleEvent = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id],
    );
  const toggleAll = () =>
    setSelected(allSelected ? [] : WEBHOOK_EVENTS.map((e) => e.id));

  const create = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Give the subscription a name.");
      return;
    }
    if (!isValidHttpUrl(url.trim())) {
      setFormError("Enter a valid http(s) URL.");
      return;
    }
    if (selected.length === 0) {
      setFormError("Select at least one event.");
      return;
    }
    const sub = createSubscription(url.trim(), name.trim(), selected);
    setCreatedSecret(sub.secret);
    setName("");
    setUrl("");
    setSelected([]);
    refresh();
  };

  const onTest = (id: string) => {
    setTestFocusId(id);
    testerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const examples = useMemo(
    () =>
      WEBHOOK_EVENTS.map((e) => ({
        id: e.id,
        json: JSON.stringify(
          formatWebhookPayload(e.id, sampleEventData(e.id)),
          null,
          2,
        ),
      })),
    [],
  );

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-2xl">Webhooks</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Subscribe to protocol events and receive a signed JSON payload at your
          endpoint. Subscriptions are stored in your browser; this is the payload
          and signing specification you implement on your own delivery service.
        </p>

        {createdSecret ? (
          <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Save this signing secret now. It is shown once and is required to
              verify webhook signatures.
            </p>
            <div className="mt-3 flex items-stretch gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-sm">
                {createdSecret}
              </code>
              <CopyButton value={createdSecret} />
            </div>
            <button
              type="button"
              onClick={() => setCreatedSecret(null)}
              className="mt-3 text-sm text-foreground/60 hover:text-foreground"
            >
              I have saved it
            </button>
          </div>
        ) : null}
      </section>

      {/* Create form */}
      <section>
        <h3 className="text-lg font-medium">Create a subscription</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Slack notifier"
              className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </label>
          <label className="block text-sm font-medium">
            Endpoint URL
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/thesislock"
              className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Events</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-foreground/60 hover:text-foreground"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {WEBHOOK_EVENTS.map((e) => (
              <label
                key={e.id}
                className="flex items-start gap-2 rounded-md border border-foreground/10 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(e.id)}
                  onChange={() => toggleEvent(e.id)}
                  className="mt-0.5"
                />
                <span>
                  <code className="text-xs">{e.id}</code>
                  <span className="block text-xs text-foreground/60">
                    {e.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {formError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={create}
          className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Create subscription
        </button>
      </section>

      {/* Subscription list */}
      <section>
        <h3 className="text-lg font-medium">Your subscriptions</h3>
        {subs.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-foreground/15 px-6 py-12 text-center text-sm text-foreground/60">
            No subscriptions yet. Create one above.
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {subs.map((sub) => (
              <li
                key={sub.id}
                className="rounded-lg border border-foreground/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sub.name || "Untitled"}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          sub.active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-foreground/10 text-foreground/60"
                        }`}
                      >
                        {sub.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-foreground/60 break-all">
                      {truncateUrl(sub.url)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sub.events.map((e) => (
                        <span
                          key={e}
                          className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/70"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-foreground/50">
                      Last triggered{" "}
                      {sub.lastTriggered
                        ? new Date(sub.lastTriggered).toLocaleString()
                        : "never"}
                      {sub.failCount > 0 ? ` · ${sub.failCount} failures` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => onTest(sub.id)}
                      className="text-foreground/60 hover:text-foreground"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSubscription(sub.id);
                        refresh();
                      }}
                      className="text-foreground/60 hover:text-foreground"
                    >
                      {sub.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSubscription(sub.id);
                        refresh();
                      }}
                      className="text-red-600 hover:text-red-500 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tester */}
      <section ref={testerRef}>
        <WebhookTester subscriptions={subs} focusId={testFocusId} />
      </section>

      {/* Documentation */}
      <section>
        <h3 className="text-lg font-medium">Webhook format</h3>
        <p className="mt-1 text-sm text-foreground/70">
          Each delivery is a POST with a JSON body of{" "}
          <code className="text-xs">{`{ event, data, timestamp }`}</code> and an{" "}
          <code className="text-xs">X-ThesisLock-Signature</code> header of the
          form <code className="text-xs">sha256=&lt;hex&gt;</code>, an HMAC-SHA256
          of the raw body using your signing secret.
        </p>

        <h4 className="mt-6 text-sm font-medium">Example payloads</h4>
        <div className="mt-2 flex flex-col gap-3">
          {examples.map((ex) => (
            <details
              key={ex.id}
              className="rounded-md border border-foreground/10"
            >
              <summary className="cursor-pointer px-3 py-2 text-sm">
                <code className="text-xs">{ex.id}</code>
              </summary>
              <pre className="overflow-x-auto border-t border-foreground/10 bg-foreground/5 p-3 text-xs">
                <code>{ex.json}</code>
              </pre>
            </details>
          ))}
        </div>

        <h4 className="mt-6 text-sm font-medium">Verify a signature (Node.js)</h4>
        <pre className="mt-2 overflow-x-auto rounded-md border border-foreground/10 bg-foreground/5 p-3 text-xs">
          <code>{NODE_SNIPPET}</code>
        </pre>

        <h4 className="mt-6 text-sm font-medium">Verify a signature (Python)</h4>
        <pre className="mt-2 overflow-x-auto rounded-md border border-foreground/10 bg-foreground/5 p-3 text-xs">
          <code>{PYTHON_SNIPPET}</code>
        </pre>

        <h4 className="mt-6 text-sm font-medium">Retry policy</h4>
        <p className="mt-1 text-sm text-foreground/70">
          Delivery and retries are handled by your integration. A common policy
          is to retry on any non-2xx response with exponential backoff (for
          example 1m, 5m, 30m) up to a handful of attempts, then pause the
          subscription. The fail count shown above is tracked in your browser for
          visibility.
        </p>
      </section>
    </div>
  );
}
