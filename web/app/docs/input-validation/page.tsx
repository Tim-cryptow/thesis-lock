import type { Metadata } from "next";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/input-validation" },
  title: { absolute: "Input Validation | ThesisLock Docs" },
  description:
    "How ThesisLock validates hashes, addresses, labels, and names with clear errors, character counters, auto-formatting, and matching API checks.",
};

export default function InputValidationDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Input Validation</h1>
      <Lead>
        Every input that takes a hash, address, label, or name validates as you
        type, with a consistent look: a character counter, a clear error message,
        and a green checkmark once the value is valid.
      </Lead>

      <H2>What gets checked</H2>
      <List
        items={[
          <>
            <strong>Hashes</strong> must be 64 hexadecimal characters. A pasted
            value is auto-formatted: surrounding whitespace and newlines are
            stripped, a leading <Code>0x</Code> is removed, and it is lowercased.
          </>,
          <>
            <strong>Stacks addresses</strong> must start with <Code>SP</Code> or{" "}
            <Code>ST</Code> and pass the checksum. A valid address shows a link to
            that wallet&apos;s profile.
          </>,
          <>
            <strong>Labels</strong> are optional, printable ASCII, and at most 64
            characters.
          </>,
          <>
            <strong>Group and collection names</strong> are required ASCII, and{" "}
            <strong>API key names</strong> are letters, numbers, and dashes.
          </>,
          <>
            <strong>Webhook URLs</strong> must be valid http or https URLs.
          </>,
        ]}
      />

      <H2>Forms and pasting</H2>
      <P>
        Create and submit buttons stay disabled until the required fields pass
        validation, so an invalid value cannot be submitted. On the watchlist,
        pasting a hash or an address auto-detects which it is and switches the
        watch type to match.
      </P>

      <H2>Matching checks at the API</H2>
      <P>
        The same rules guard the REST API. Requests with a malformed hash,
        address, or query come back as a <Code>400</Code> with a clear message
        rather than failing deeper in, so integrations get fast, specific
        feedback.
      </P>

      <H2>For contributors</H2>
      <P>
        Validation lives in <Code>lib/validators.ts</Code> as small pure
        functions returning <Code>{"{ valid, error }"}</Code>. The{" "}
        <Code>ValidatedInput</Code> component renders the field, debounced error,
        counter, and checkmark, and <Code>HashInput</Code> and{" "}
        <Code>AddressInput</Code> build on it with their auto-formatting.
      </P>
      <CodeBlock language="tsx">{`import ValidatedInput from "@/app/components/ValidatedInput";
import { validateGroupName } from "@/lib/validators";

<ValidatedInput
  label="Group name"
  value={name}
  onChange={setName}
  validator={validateGroupName}
  maxLength={64}
  required
/>`}</CodeBlock>
    </div>
  );
}
