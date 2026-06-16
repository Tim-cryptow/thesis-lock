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

export const TEMPLATES: AnchorTemplate[] = [
  {
    id: "paper",
    name: "Academic Paper",
    icon: "P",
    description:
      "Theses, journal articles, and preprints. Records title, version, and department.",
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
    description:
      "Source releases and build artifacts. Records repository, version, and tag.",
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
    description:
      "Research datasets and data exports. Records name, version, and format.",
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
    description:
      "Diplomas, awards, and credentials. Records recipient, issuer, and date.",
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
    description:
      "A free-form label with no structure. The original anchoring behaviour.",
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
