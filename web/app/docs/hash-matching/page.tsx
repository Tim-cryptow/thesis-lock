import type { Metadata } from "next";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/hash-matching" },
  title: { absolute: "Hash Matching | ThesisLock Docs" },
  description:
    "File previews with thumbnails, and the hash matcher that confirms a file matches an anchored hash for integrity checks.",
};

export default function HashMatchingDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Hash Matching</h1>
      <Lead>
        When you drop a file, ThesisLock shows what it is and lets you confirm it
        is byte-for-byte the file you anchored. All hashing happens in your
        browser; files never leave your device.
      </Lead>

      <H2>File preview</H2>
      <P>
        Dropping a file on the anchor page, the bulk verify page, or the hash
        matcher shows a preview of it: the filename, size, type, and last
        modified date, plus the computed SHA-256 hash. Images show a thumbnail,
        PDFs show a page count when it can be detected, and other files show an
        icon for their type, so you can tell at a glance which file is which.
      </P>

      <H2>Matching a file to a hash</H2>
      <P>
        A document&apos;s hash changes completely if a single byte changes, so
        comparing hashes is an exact integrity check. The{" "}
        <Code>/match</Code> page (linked as Hash Matcher in the footer) compares
        two hashes side by side:
      </P>
      <List
        items={[
          <>
            <strong>Hash vs File</strong>: paste an anchored hash on the left,
            drop a file on the right, and see whether they match.
          </>,
          <>
            <strong>File vs File</strong>: drop two files to confirm they are
            identical.
          </>,
        ]}
      />
      <P>
        A match shows a green confirmation; a mismatch shows red, with both
        hashes printed below and the differing characters highlighted so you can
        see exactly where they diverge. When two hashes match you can jump
        straight to verifying that hash on chain.
      </P>

      <H2>On the verify page</H2>
      <P>
        Every verify page (<Code>/v/&lt;hash&gt;</Code>) includes a{" "}
        <em>Verify your file matches</em> section with the anchored hash
        pre-filled. Drop your copy of the file to confirm it matches the hash
        that was anchored on chain, without leaving the page.
      </P>
    </div>
  );
}
