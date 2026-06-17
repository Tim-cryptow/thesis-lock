"use client";

import {
  isComplete,
  type Endpoint,
  type EndpointParam,
} from "./endpoints";

type Props = {
  endpoint: Endpoint;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

// Validation message for a single field, or null when it is acceptable.
// Required-but-empty is surfaced separately so empty fields do not show a
// format error before the user has typed anything.
function fieldError(param: EndpointParam, value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return param.validate ? param.validate(trimmed) : null;
}

function Field({
  param,
  value,
  onChange,
}: {
  param: EndpointParam;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `param-${param.name}`;
  const error = fieldError(param, value);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        <span className="font-mono">{param.label}</span>
        {param.required ? (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-foreground/40">
            optional
          </span>
        )}
      </label>

      {param.kind === "select" ? (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm font-mono focus:border-foreground/40 focus:outline-none"
        >
          {(param.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={param.placeholder}
          required={param.required}
          aria-invalid={error ? "true" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none ${
            error
              ? "border-red-500/60 focus:border-red-500"
              : "border-foreground/15 focus:border-foreground/40"
          }`}
        />
      )}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export default function ParameterForm({
  endpoint,
  values,
  onChange,
  onSubmit,
  loading,
}: Props) {
  const ready = isComplete(endpoint, values);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !loading) onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-foreground/40">
        Parameters
      </h2>

      {endpoint.params.length === 0 ? (
        <p className="text-sm text-foreground/50">
          This endpoint takes no parameters.
        </p>
      ) : (
        endpoint.params.map((param) => (
          <Field
            key={param.name}
            param={param}
            value={values[param.name] ?? ""}
            onChange={(value) => onChange(param.name, value)}
          />
        ))
      )}

      <button
        type="submit"
        disabled={!ready || loading}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Sending..." : "Send Request"}
      </button>
    </form>
  );
}
