// Anchor templates give users pre-defined label formats and metadata schemas.
// A template encodes its fields into a single structured label string that fits
// the on-chain 64 ASCII character limit, and that string can be parsed back
// into fields on the verify and history pages.
//
// Label format: "<prefix><key>:<value>|<key>:<value>..."
//   e.g. "paper-title:my-thesis|v:2|dept:biology"
// The prefix already ends with "-", so it joins directly onto the first field.
// The Generic template has no prefix and stores the raw label as-is, matching
// the original single-input behaviour for backward compatibility.

export type TemplateField = {
  // Human-readable label shown in the form.
  name: string;
  // Short key used in the encoded label string. Keeping it terse leaves more of
  // the 64 char budget for the actual values.
  key: string;
  placeholder: string;
  required: boolean;
  maxLength: number;
};

export type AnchorTemplate = {
  id: string;
  name: string;
  // Single-character badge, not an emoji (UI is emoji-free by convention).
  icon: string;
  description: string;
  labelPrefix: string;
  fields: TemplateField[];
  category: string;
};

// The maximum on-chain label length, in ASCII characters.
export const MAX_LABEL_LENGTH = 64;

// The Generic template id is referenced directly when deciding whether to show
// the structured fields or the original single label input.
export const GENERIC_TEMPLATE_ID = "generic";

// The user's preferred default template for new anchors, chosen in settings.
export const DEFAULT_TEMPLATE_KEY = "thesislock_default_template";

export function getDefaultTemplateId(): string {
  if (typeof window === "undefined") return GENERIC_TEMPLATE_ID;
  try {
    return window.localStorage.getItem(DEFAULT_TEMPLATE_KEY) ?? GENERIC_TEMPLATE_ID;
  } catch {
    return GENERIC_TEMPLATE_ID;
  }
}

export function setDefaultTemplateId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEFAULT_TEMPLATE_KEY, id);
  } catch {
    // Non-fatal if persistence is unavailable.
  }
}

export const TEMPLATES: AnchorTemplate[] = [
  {
    id: "paper",
    name: "Academic Paper",
    icon: "P",
    description: "Theses, journal articles, and preprints. Records title, version, and department.",
    labelPrefix: "paper-",
    category: "Academic",
    fields: [
      {
        name: "Title",
        key: "title",
        placeholder: "thesis-chapter-3",
        required: true,
        maxLength: 32,
      },
      {
        name: "Version",
        key: "v",
        placeholder: "2",
        required: false,
        maxLength: 8,
      },
      {
        name: "Department",
        key: "dept",
        placeholder: "biology",
        required: false,
        maxLength: 16,
      },
    ],
  },
  {
    id: "legal",
    name: "Legal Document",
    icon: "L",
    description:
      "Contracts, filings, and agreements. Records title, case number, and jurisdiction.",
    labelPrefix: "legal-",
    category: "Legal",
    fields: [
      {
        name: "Title",
        key: "title",
        placeholder: "services-agreement",
        required: true,
        maxLength: 28,
      },
      {
        name: "Case Number",
        key: "case",
        placeholder: "2026-cv-1234",
        required: false,
        maxLength: 16,
      },
      {
        name: "Jurisdiction",
        key: "juris",
        placeholder: "ny",
        required: false,
        maxLength: 12,
      },
    ],
  },
  {
    id: "release",
    name: "Code Release",
    icon: "R",
    description: "Source releases and build artifacts. Records repository, version, and tag.",
    labelPrefix: "release-",
    category: "Software",
    fields: [
      {
        name: "Repository",
        key: "repo",
        placeholder: "thesis-lock",
        required: true,
        maxLength: 28,
      },
      {
        name: "Version",
        key: "v",
        placeholder: "1.4.0",
        required: false,
        maxLength: 12,
      },
      {
        name: "Tag",
        key: "tag",
        placeholder: "stable",
        required: false,
        maxLength: 12,
      },
    ],
  },
  {
    id: "dataset",
    name: "Dataset",
    icon: "D",
    description: "Research datasets and data exports. Records name, version, and format.",
    labelPrefix: "data-",
    category: "Data",
    fields: [
      {
        name: "Name",
        key: "name",
        placeholder: "survey-results",
        required: true,
        maxLength: 30,
      },
      {
        name: "Version",
        key: "v",
        placeholder: "3",
        required: false,
        maxLength: 8,
      },
      {
        name: "Format",
        key: "fmt",
        placeholder: "csv",
        required: false,
        maxLength: 10,
      },
    ],
  },
  {
    id: "certificate",
    name: "Certificate",
    icon: "C",
    description: "Diplomas, awards, and credentials. Records recipient, issuer, and date.",
    labelPrefix: "cert-",
    category: "Credential",
    fields: [
      {
        name: "Recipient",
        key: "to",
        placeholder: "jane-doe",
        required: true,
        maxLength: 24,
      },
      {
        name: "Issuer",
        key: "by",
        placeholder: "state-university",
        required: false,
        maxLength: 20,
      },
      {
        name: "Date",
        key: "date",
        placeholder: "2026-06",
        required: false,
        maxLength: 10,
      },
    ],
  },
  {
    id: GENERIC_TEMPLATE_ID,
    name: "Generic",
    icon: "G",
    description: "A free-form label with no structure. The original anchoring behaviour.",
    labelPrefix: "",
    category: "General",
    fields: [
      {
        name: "Label",
        key: "label",
        placeholder: "e.g. thesis-chapter-3-draft-v2",
        required: false,
        maxLength: MAX_LABEL_LENGTH,
      },
    ],
  },
];

export function getTemplate(id: string): AnchorTemplate | undefined {
  return TEMPLATES.find((tpl) => tpl.id === id);
}

export const GENERIC_TEMPLATE: AnchorTemplate = TEMPLATES.find(
  (tpl) => tpl.id === GENERIC_TEMPLATE_ID,
)!;

// The two characters used to delimit the encoded label. They are stripped from
// values so a value can never break the structure when parsed back.
const SEGMENT_SEP = "|";
const KEY_VALUE_SEP = ":";

// Normalizes a single field value: collapse whitespace to dashes and remove the
// delimiter characters, keeping the encoded label unambiguous to parse.
function sanitizeValue(raw: string): string {
  return raw.trim().replace(/\s+/g, "-").split(SEGMENT_SEP).join("").split(KEY_VALUE_SEP).join("");
}

// Like buildLabel but without the length cap, so callers (the live preview)
// can tell whether the on-chain label would be truncated.
export function buildRawLabel(
  template: AnchorTemplate,
  fieldValues: Record<string, string>,
): string {
  if (template.id === GENERIC_TEMPLATE_ID) {
    const only = template.fields[0];
    return (fieldValues[only.key] ?? "").trim();
  }

  const segments = template.fields
    .map((field) => {
      const value = sanitizeValue(fieldValues[field.key] ?? "");
      return value ? `${field.key}${KEY_VALUE_SEP}${value}` : null;
    })
    .filter((segment): segment is string => segment !== null);

  if (segments.length === 0) return "";

  return template.labelPrefix + segments.join(SEGMENT_SEP);
}

// Combines a template's prefix and field values into a single structured label.
// Empty fields are skipped. The Generic template returns the raw label value
// unchanged (aside from the length cap), preserving the original behaviour.
// The result is always capped at MAX_LABEL_LENGTH ASCII characters.
export function buildLabel(template: AnchorTemplate, fieldValues: Record<string, string>): string {
  return buildRawLabel(template, fieldValues).slice(0, MAX_LABEL_LENGTH);
}

// Labels are stored on chain as ASCII only, matching the single-anchor input.
export const ASCII_LABEL_REGEX = /^[\x20-\x7E]*$/;

// Per-field validation. Returns a stable error id ("asciiOnly" | "required")
// the UI can translate, or null when the field is valid.
export function templateFieldError(
  field: TemplateField,
  value: string,
): "asciiOnly" | "required" | null {
  if (!ASCII_LABEL_REGEX.test(value)) return "asciiOnly";
  if (field.required && value.trim() === "") return "required";
  return null;
}

// True when every field in the template passes validation, so the caller can
// gate submission. Over-length is handled by buildLabel truncating, not here.
export function isTemplateValid(
  template: AnchorTemplate,
  fieldValues: Record<string, string>,
): boolean {
  return template.fields.every(
    (field) => templateFieldError(field, fieldValues[field.key] ?? "") === null,
  );
}

// The shape parseLabel returns: an optional detected template id plus the
// decoded { key: value } fields. Named so callers (the comparison library,
// verify and history views) can pass parsed labels around with a stable type.
export type ParsedTemplate = {
  templateId?: string;
  fields: Record<string, string>;
};

// Reverse of buildLabel. Detects the template from the label prefix and splits
// the structured segments back into a { key: value } map. Falls back to
// { fields: { label: rawLabel } } for unstructured or empty labels so the
// caller can always render something.
export function parseLabel(label: string): ParsedTemplate {
  if (!label) return { fields: { label } };

  // Match the longest non-empty prefix first so "release-" is not shadowed by a
  // shorter prefix. Generic has an empty prefix and is never matched here.
  const candidates = TEMPLATES.filter(
    (tpl) => tpl.labelPrefix && label.startsWith(tpl.labelPrefix),
  ).sort((a, b) => b.labelPrefix.length - a.labelPrefix.length);

  for (const template of candidates) {
    const body = label.slice(template.labelPrefix.length);
    // A genuine structured label always carries at least one "key:value" pair.
    // Requiring the separator avoids misreading a free-form label that merely
    // happens to start with these characters as a template.
    if (!body.includes(KEY_VALUE_SEP)) continue;

    const fields: Record<string, string> = {};
    for (const segment of body.split(SEGMENT_SEP)) {
      const idx = segment.indexOf(KEY_VALUE_SEP);
      if (idx <= 0) continue;
      const key = segment.slice(0, idx);
      const value = segment.slice(idx + 1);
      if (key && value) fields[key] = value;
    }
    if (Object.keys(fields).length > 0) {
      return { templateId: template.id, fields };
    }
  }

  return { fields: { label } };
}
