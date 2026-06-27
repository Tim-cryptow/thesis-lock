"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ContractInfo,
  type FunctionArg,
  type FunctionInfo,
  type ReadOnlyResult,
  callReadOnly,
  getReadOnlyFunctions,
} from "@/lib/contractExplorer";

// JSON.stringify that survives the bigint values cvToValue returns for uints.
function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val), 2);
}

function stringAsciiMax(type: string): number | undefined {
  const m = type.match(/\(string-ascii\s+(\d+)\)/);
  return m ? Number(m[1]!) : undefined;
}

function unwrapOptional(type: string): string {
  const m = type.trim().match(/^\(optional\s+(.+)\)$/);
  return m ? m[1]!.trim() : type;
}

function placeholderFor(type: string): string {
  const t = unwrapOptional(type);
  if (t.startsWith("(buff")) return "64 hex chars";
  if (t === "principal") return "SP...";
  if (t === "uint") return "0";
  if (t.startsWith("(string-ascii")) return "text";
  return "";
}

export default function ReadOnlyTester({ contract }: { contract: ContractInfo }) {
  const readFns = useMemo(() => getReadOnlyFunctions(contract), [contract]);
  const [fnName, setFnName] = useState(readFns[0]?.name ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ReadOnlyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fn: FunctionInfo | undefined = useMemo(
    () => readFns.find((f) => f.name === fnName),
    [readFns, fnName],
  );

  // Reset selection and inputs whenever the contract changes.
  useEffect(() => {
    setFnName(readFns[0]?.name ?? "");
  }, [readFns]);

  useEffect(() => {
    setValues({});
    setIncluded({});
    setResult(null);
    setError(null);
  }, [fnName]);

  const isOptional = (arg: FunctionArg) => arg.type.trim().startsWith("(optional");

  const call = useCallback(async () => {
    if (!fn) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const args = fn.args.map((arg) => {
        if (isOptional(arg) && !included[arg.name]) return null;
        return values[arg.name] ?? "";
      });
      const res = await callReadOnly(contract.name, fn.name, args);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setLoading(false);
    }
  }, [fn, contract.name, values, included]);

  if (readFns.length === 0) {
    return (
      <p className="text-sm text-foreground/60">This contract exposes no read-only functions.</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground/65">
        Call a read-only function against the live mainnet contract through the Hiro API. These
        reads are free and need no wallet.
      </p>

      <label className="text-xs text-foreground/55">
        Function
        <select
          value={fnName}
          onChange={(e) => setFnName(e.target.value)}
          className="mt-1 block w-full rounded border border-foreground/15 bg-background px-3 py-2 font-mono text-sm text-foreground/85"
        >
          {readFns.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      {fn && fn.args.length > 0 && (
        <div className="flex flex-col gap-3">
          {fn.args.map((arg) => {
            const optional = isOptional(arg);
            const inner = unwrapOptional(arg.type);
            const maxLen = stringAsciiMax(inner);
            const disabled = optional && !included[arg.name];
            return (
              <div key={arg.name} className="text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-foreground/80">{arg.name}</span>
                  <span className="font-mono text-foreground/45">{arg.type}</span>
                  {optional && (
                    <label className="ml-auto flex items-center gap-1 text-foreground/55">
                      <input
                        type="checkbox"
                        checked={Boolean(included[arg.name])}
                        onChange={(e) =>
                          setIncluded((prev) => ({
                            ...prev,
                            [arg.name]: e.target.checked,
                          }))
                        }
                      />
                      include
                    </label>
                  )}
                </div>
                <input
                  type={inner === "uint" ? "number" : "text"}
                  min={inner === "uint" ? 0 : undefined}
                  maxLength={maxLen}
                  disabled={disabled}
                  value={values[arg.name] ?? ""}
                  placeholder={placeholderFor(arg.type)}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [arg.name]: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-foreground/15 bg-background px-3 py-2 font-mono text-sm text-foreground/85 disabled:opacity-40"
                />
              </div>
            );
          })}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => void call()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-foreground/20 bg-card px-4 py-2 text-sm hover:border-foreground/40 disabled:opacity-50"
        >
          {loading && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground"
            />
          )}
          {loading ? "Calling..." : "Call Function"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <ResultBlock title="Formatted output">{safeStringify(result.value)}</ResultBlock>
          <ResultBlock title="Decoded JSON">{safeStringify(result.json)}</ResultBlock>
          <ResultBlock title="Raw Clarity value">{result.raw}</ResultBlock>
        </div>
      )}
    </div>
  );
}

function ResultBlock({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-foreground/45">{title}</div>
      <pre className="overflow-x-auto rounded-lg border border-foreground/10 bg-background/60 p-3 text-xs font-mono text-foreground/85">
        {children}
      </pre>
    </div>
  );
}
