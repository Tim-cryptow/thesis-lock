"use client";

import { ENDPOINT_GROUPS, type Endpoint } from "./endpoints";

type Props = {
  selectedId: string;
  onSelect: (endpoint: Endpoint) => void;
};

function MethodBadge({ method }: { method: Endpoint["method"] }) {
  const color =
    method === "GET"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium ${color}`}>
      {method}
    </span>
  );
}

export default function EndpointSelector({ selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="playground-endpoint" className="text-sm font-medium text-foreground">
        Endpoint
      </label>
      <select
        id="playground-endpoint"
        value={selectedId}
        onChange={(event) => {
          const next = ENDPOINT_GROUPS.flatMap((g) => g.endpoints).find(
            (endpoint) => endpoint.id === event.target.value,
          );
          if (next) onSelect(next);
        }}
        className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm font-mono focus:border-foreground/40 focus:outline-none"
      >
        {ENDPOINT_GROUPS.map((group) => (
          <optgroup key={group.category} label={group.category}>
            {group.endpoints.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.method} {endpoint.path}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <ul className="mt-2 flex flex-col gap-1.5">
        {ENDPOINT_GROUPS.map((group) => (
          <li key={group.category}>
            <p className="mt-2 mb-1 text-xs uppercase tracking-wide text-foreground/40">
              {group.category}
            </p>
            <ul className="flex flex-col gap-1">
              {group.endpoints.map((endpoint) => {
                const active = endpoint.id === selectedId;
                return (
                  <li key={endpoint.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(endpoint)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition ${
                        active ? "bg-foreground/5" : "hover:bg-foreground/5"
                      }`}
                    >
                      <MethodBadge method={endpoint.method} />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-mono text-xs text-foreground">{endpoint.path}</span>
                        <span className="text-xs text-foreground/50">{endpoint.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
