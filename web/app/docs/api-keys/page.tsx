import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/api-keys" },
  title: { absolute: "API Keys | ThesisLock Docs" },
  description:
    "Create and manage ThesisLock API keys in the developer portal, how they are stored, and what they are for.",
};

export default function ApiKeys() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">API Keys</h1>
      <Lead>
        The developer portal lets you create named API keys with scoped
        permissions. They model the integration flow of a real developer portal:
        create a key, copy it, and reference it from your app.
      </Lead>

      <H2>How keys work today</H2>
      <P>
        ThesisLock&apos;s read API is public and unauthenticated, so a key is not
        required to call any endpoint. Keys are generated and stored entirely in
        your browser&apos;s local storage under{" "}
        <Code>thesislock_api_keys</Code>. Nothing is sent to a server, and
        clearing site data removes them. This is an MVP: for production access
        control, validate keys server-side behind your own gateway.
      </P>

      <H2>Creating a key</H2>
      <List
        items={[
          <>
            Open the{" "}
            <Link
              href="/developers#keys"
              className="underline hover:text-foreground"
            >
              API Keys tab
            </Link>{" "}
            in the developer portal.
          </>,
          <>Select Create new API key, name it, and choose permissions.</>,
          <>
            Copy the key from the reveal dialog and store it somewhere safe. The
            full key also stays available from the key list on this browser
            (it lives in local storage); revoke and replace it if it leaks.
          </>,
        ]}
      />

      <H2>Key format and permissions</H2>
      <P>
        Keys have the form <Code>tl_</Code> followed by 32 hex characters,
        generated with <Code>crypto.getRandomValues</Code>. In lists they are
        masked to the prefix, the first six characters, and the last four.
        Permissions map to the public API surfaces:
      </P>
      <List
        items={[
          <>
            <Code>verify</Code>, <Code>search</Code>, <Code>stats</Code>,{" "}
            <Code>badges</Code>, <Code>profiles</Code>, and <Code>compare</Code>.
          </>,
        ]}
      />
      <CodeBlock language="ts">{`import { generateApiKey, maskKey } from '@/lib/apiKeys';

const key = generateApiKey();   // "tl_3f9a...." (35 chars)
maskKey(key);                   // "tl_3f9a1b...c4d2"`}</CodeBlock>

      <P>
        Ready to integrate? See the{" "}
        <Link
          href="/developers#guides"
          className="underline hover:text-foreground"
        >
          Integration Guides
        </Link>
        .
      </P>
    </div>
  );
}
