// Endpoint definitions that drive the entire API playground: the selector
// dropdown, the dynamic parameter form, the live curl preview, and how the
// response panel renders the result. Adding an endpoint here wires it into all
// four pieces with no further changes.

export const PLAYGROUND_BASE = "https://thesis-lock.vercel.app";

export type HttpMethod = "GET" | "POST";

export type ParamLocation = "path" | "query";

export type ParamKind = "text" | "select";

export type EndpointParam = {
  name: string;
  label: string;
  kind: ParamKind;
  location: ParamLocation;
  required: boolean;
  placeholder?: string;
  // For select fields. The first option is the default value.
  options?: string[];
  // Returns an error message for an invalid non-empty value, or null when the
  // value is acceptable. Empty optional values are never validated.
  validate?: (value: string) => string | null;
};

export type EndpointResponseKind = "json" | "image";

export type Endpoint = {
  id: string;
  method: HttpMethod;
  // Path template with [name] placeholders for path params, e.g.
  // "/api/verify/[hash]".
  path: string;
  description: string;
  params: EndpointParam[];
  responseKind: EndpointResponseKind;
};

export type EndpointCategory = {
  category: string;
  endpoints: Endpoint[];
};

const HEX_64 = /^[0-9a-f]{64}$/i;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/i;

function validateHash(value: string): string | null {
  return HEX_64.test(value.trim())
    ? null
    : "Must be a 64 character hex hash.";
}

function validatePrincipal(value: string): string | null {
  return STX_PRINCIPAL.test(value.trim())
    ? null
    : "Must be a Stacks principal (starts with SP).";
}

const hashParam: EndpointParam = {
  name: "hash",
  label: "hash",
  kind: "text",
  location: "path",
  required: true,
  placeholder: "64-char hex",
  validate: validateHash,
};

const ownerParam: EndpointParam = {
  name: "owner",
  label: "owner",
  kind: "text",
  location: "query",
  required: false,
  placeholder: "SP...",
  validate: validatePrincipal,
};

export const ENDPOINT_GROUPS: EndpointCategory[] = [
  {
    category: "Verification",
    endpoints: [
      {
        id: "verify",
        method: "GET",
        path: "/api/verify/[hash]",
        description: "Verify a single anchored hash and read its record.",
        params: [hashParam, ownerParam],
        responseKind: "json",
      },
      {
        id: "compare",
        method: "GET",
        path: "/api/compare",
        description: "Compare two anchored documents side by side.",
        params: [
          {
            name: "a",
            label: "a",
            kind: "text",
            location: "query",
            required: true,
            placeholder: "64-char hex",
            validate: validateHash,
          },
          {
            name: "b",
            label: "b",
            kind: "text",
            location: "query",
            required: true,
            placeholder: "64-char hex",
            validate: validateHash,
          },
          {
            name: "ownerA",
            label: "ownerA",
            kind: "text",
            location: "query",
            required: false,
            placeholder: "SP...",
            validate: validatePrincipal,
          },
          {
            name: "ownerB",
            label: "ownerB",
            kind: "text",
            location: "query",
            required: false,
            placeholder: "SP...",
            validate: validatePrincipal,
          },
        ],
        responseKind: "json",
      },
    ],
  },
  {
    category: "Data",
    endpoints: [
      {
        id: "stats",
        method: "GET",
        path: "/api/stats",
        description: "Aggregate counts across all ThesisLock contracts.",
        params: [],
        responseKind: "json",
      },
      {
        id: "search",
        method: "GET",
        path: "/api/search",
        description: "Search by hash, principal, or label.",
        params: [
          {
            name: "q",
            label: "q",
            kind: "text",
            location: "query",
            required: true,
            placeholder: "hash, principal, or label",
          },
          {
            name: "type",
            label: "type",
            kind: "select",
            location: "query",
            required: false,
            options: ["auto", "hash", "principal", "label"],
          },
          ownerParam,
        ],
        responseKind: "json",
      },
      {
        id: "activity",
        method: "GET",
        path: "/api/activity",
        description: "Per-wallet cross-contract activity timeline.",
        params: [
          {
            name: "address",
            label: "address",
            kind: "text",
            location: "query",
            required: true,
            placeholder: "SP...",
            validate: validatePrincipal,
          },
          {
            name: "type",
            label: "type",
            kind: "select",
            location: "query",
            required: false,
            // "all" is not a real category, so the route treats it as no filter
            // and returns every event type.
            options: ["all", "anchors", "groups", "proofs", "registry"],
          },
          {
            name: "page",
            label: "page",
            kind: "text",
            location: "query",
            required: false,
            placeholder: "0",
          },
          {
            name: "limit",
            label: "limit",
            kind: "text",
            location: "query",
            required: false,
            placeholder: "20",
          },
        ],
        responseKind: "json",
      },
    ],
  },
  {
    category: "Assets",
    endpoints: [
      {
        id: "badge",
        method: "GET",
        path: "/api/badge/[hash]",
        description: "Shields-style Verified on Stacks SVG badge.",
        params: [
          hashParam,
          {
            name: "style",
            label: "style",
            kind: "select",
            location: "query",
            required: false,
            options: ["flat", "rounded"],
          },
          {
            name: "label",
            label: "label",
            kind: "text",
            location: "query",
            required: false,
            placeholder: "Custom left-hand label",
          },
          ownerParam,
        ],
        responseKind: "image",
      },
      {
        id: "card",
        method: "GET",
        path: "/api/card/[hash]",
        description: "Social sharing card image for an anchor.",
        params: [hashParam, ownerParam],
        responseKind: "image",
      },
      {
        id: "profile-badge",
        method: "GET",
        path: "/api/profile-badge/[address]",
        description: "Anchoring-count badge for a wallet.",
        params: [
          {
            name: "address",
            label: "address",
            kind: "text",
            location: "path",
            required: true,
            placeholder: "SP...",
            validate: validatePrincipal,
          },
        ],
        responseKind: "image",
      },
    ],
  },
  {
    category: "System",
    endpoints: [
      {
        id: "health",
        method: "GET",
        path: "/api/health",
        description: "Service status and contract identifiers.",
        params: [],
        responseKind: "json",
      },
    ],
  },
];

export const ALL_ENDPOINTS: Endpoint[] = ENDPOINT_GROUPS.flatMap(
  (group) => group.endpoints,
);

export function findEndpoint(id: string): Endpoint | undefined {
  return ALL_ENDPOINTS.find((endpoint) => endpoint.id === id);
}

/** The default starting value for a parameter (first option for selects). */
export function defaultParamValue(param: EndpointParam): string {
  if (param.kind === "select" && param.options && param.options.length > 0) {
    return param.options[0];
  }
  return "";
}

/** Initial value map for every parameter of an endpoint. */
export function initialValues(endpoint: Endpoint): Record<string, string> {
  const values: Record<string, string> = {};
  for (const param of endpoint.params) {
    values[param.name] = defaultParamValue(param);
  }
  return values;
}

/** True when every required parameter has a non-empty, valid value. */
export function isComplete(
  endpoint: Endpoint,
  values: Record<string, string>,
): boolean {
  for (const param of endpoint.params) {
    const value = (values[param.name] ?? "").trim();
    if (param.required && value === "") return false;
    if (value !== "" && param.validate && param.validate(value) !== null) {
      return false;
    }
  }
  return true;
}

/**
 * Build the request path (with query string) for an endpoint and its values.
 * Path params are substituted into the template; query params are appended in
 * declaration order. Empty optional values are omitted. A blank value is
 * substituted as the empty string for required path params so the path stays
 * well-formed while typing.
 */
export function buildPath(
  endpoint: Endpoint,
  values: Record<string, string>,
): string {
  let path = endpoint.path;
  const query: string[] = [];

  for (const param of endpoint.params) {
    const raw = (values[param.name] ?? "").trim();
    if (param.location === "path") {
      path = path.replace(`[${param.name}]`, encodeURIComponent(raw));
    } else if (raw !== "") {
      query.push(
        `${encodeURIComponent(param.name)}=${encodeURIComponent(raw)}`,
      );
    }
  }

  return query.length > 0 ? `${path}?${query.join("&")}` : path;
}

/** Full absolute URL for a request against the production deployment. */
export function buildUrl(
  endpoint: Endpoint,
  values: Record<string, string>,
): string {
  return `${PLAYGROUND_BASE}${buildPath(endpoint, values)}`;
}
