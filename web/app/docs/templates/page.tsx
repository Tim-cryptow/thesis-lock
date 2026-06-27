import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P, Table } from "../ui";
import { GENERIC_TEMPLATE_ID, TEMPLATES, buildLabel, type AnchorTemplate } from "@/lib/templates";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/templates" },
  title: { absolute: "Anchor Templates | ThesisLock Docs" },
  description:
    "Structured label formats for papers, legal documents, code releases, datasets, and certificates, plus the label encoding and how to add custom templates.",
};

function exampleLabel(template: AnchorTemplate): string {
  if (template.id === GENERIC_TEMPLATE_ID) {
    return template.fields[0].placeholder.replace(/^e\.g\.\s*/, "");
  }
  const values = Object.fromEntries(template.fields.map((field) => [field.key, field.placeholder]));
  return buildLabel(template, values);
}

export default function TemplatesDoc() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Anchor Templates</h1>
      <Lead>
        Templates turn the free-form anchor label into a structured, consistent format. Each
        template defines a prefix and a set of fields that are encoded into a single on-chain label,
        so anchors of the same kind read and search the same way.
      </Lead>

      <H2>Why templates</H2>
      <P>
        Every anchor carries an optional label of up to 64 ASCII characters. Left free-form, labels
        drift: one paper is <Code>thesis final v2</Code>, the next is <Code>Thesis-FINAL</Code>.
        Templates record the same fields in the same order every time, which keeps a wallet&apos;s
        history tidy and makes structured labels easy to parse back into their parts on the verify
        and history pages.
      </P>

      <H2>Label format</H2>
      <P>
        A structured label is the template prefix followed by <Code>key:value</Code> pairs joined by{" "}
        <Code>|</Code>. The prefix ends with a dash and joins directly onto the first field:
      </P>
      <CodeBlock language="text">{`paper-title:my-thesis|v:2|dept:biology`}</CodeBlock>
      <P>
        Empty optional fields are skipped. Values have whitespace collapsed to dashes and the{" "}
        <Code>|</Code> and <Code>:</Code> delimiters removed so the label always parses back
        unambiguously. The combined label is capped at 64 characters; the anchor form shows a live
        preview and warns before anything would be truncated. The <strong>Generic</strong> template
        has no prefix and stores whatever you type, exactly like the original single label field.
      </P>

      <H2>Built-in templates</H2>
      <Table
        headers={["Template", "Prefix", "Fields", "Example label"]}
        rows={TEMPLATES.map((template) => [
          template.name,
          template.labelPrefix ? <Code>{template.labelPrefix}</Code> : "none",
          template.fields.map((f) => f.name).join(", "),
          <Code key={template.id}>{exampleLabel(template)}</Code>,
        ])}
      />

      <H2>Using a template</H2>
      <List
        items={[
          <>
            Browse the{" "}
            <Link href="/templates" className="underline hover:text-foreground">
              template library
            </Link>{" "}
            and choose <Code>Use this template</Code>, or pick one directly on the{" "}
            <Link href="/anchor" className="underline hover:text-foreground">
              anchor page
            </Link>
            .
          </>,
          <>Fill in the fields. The generated label updates live below the form.</>,
          <>Anchor as usual. The structured label is what gets written on chain.</>,
          <>
            On the verify and history pages, a structured label is shown with a template badge and
            its fields broken out as key-value pairs.
          </>,
        ]}
      />
      <P>
        The library page also accepts a deep link: <Code>/anchor?template=paper</Code> opens the
        anchor form with that template pre-selected.
      </P>

      <H2>Custom templates</H2>
      <P>
        Templates are defined in <Code>web/lib/templates.ts</Code> as plain data. To add one, append
        an <Code>AnchorTemplate</Code> to the <Code>TEMPLATES</Code> array with a unique{" "}
        <Code>id</Code>, a single character <Code>icon</Code>, a <Code>labelPrefix</Code> ending in
        a dash, and a list of fields. Each field needs a short <Code>key</Code> used in the encoded
        label and a human <Code>name</Code> shown in the form:
      </P>
      <CodeBlock language="ts">{`{
  id: "invoice",
  name: "Invoice",
  icon: "I",
  description: "Billing documents. Records number, client, and amount.",
  labelPrefix: "inv-",
  category: "Finance",
  fields: [
    { name: "Number", key: "no", placeholder: "2026-014", required: true, maxLength: 16 },
    { name: "Client", key: "client", placeholder: "acme", required: false, maxLength: 20 },
    { name: "Amount", key: "amt", placeholder: "1200-usd", required: false, maxLength: 16 },
  ],
}`}</CodeBlock>
      <P>
        Keep the keys terse: every character counts against the 64 character on-chain budget. The
        selector, fields form, live preview, verify badge, and history filter all pick up the new
        template automatically.
      </P>
    </div>
  );
}
