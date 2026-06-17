import type { Metadata } from "next";
import Link from "next/link";
import { Code, CodeBlock, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Anchor Comparison | ThesisLock Docs" },
  description:
    "Compare two anchored documents side by side: which was anchored first, the estimated time gap, and how their owner, label, source, and metadata differ, with shareable comparison links.",
};

export default function CompareDoc() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Anchor Comparison</h1>
      <Lead>
        Anchoring multiple versions of a document leaves you with several
        hashes. The comparison page at <Code>/compare</Code> puts two of them
        side by side, so you can confirm which version came first, whether one
        supersedes another, and exactly how their on-chain metadata differs.
        This is built for academic review boards and legal workflows that need
        to reason about document revisions.
      </Lead>

      <H2>Comparing two documents</H2>
      <P>
        Open <Link href="/compare">/compare</Link>. Each column accepts a
        document independently: drop a file to hash it in your browser, or paste
        a 64 character hex hash directly. As with the rest of ThesisLock, files
        dropped for hashing never leave your device. For batch anchors, add the
        owner principal so the comparison resolves the right owner-keyed record.
        Once both hashes are present, choose <strong>Compare</strong>.
      </P>

      <H2>What the comparison shows</H2>
      <P>
        Each hash is resolved across every anchoring contract (single, batch,
        and group) and the results are laid out in a table. Cells that differ
        between the two documents are highlighted so changes stand out:
      </P>
      <List
        items={[
          <>
            <strong>Status</strong>: whether each hash is anchored on chain.
          </>,
          <>
            <strong>Label</strong>: the on-chain label, parsed into template
            fields when it was created from a template.
          </>,
          <>
            <strong>Source</strong>: the contract that backs the anchor, shown
            as a single, batch, or group badge.
          </>,
          <>
            <strong>Owner</strong>: the anchoring principal, linked to its
            public profile.
          </>,
          <>
            <strong>Stacks block</strong> and <strong>Proof NFT</strong>: the
            settlement block and any soulbound proof token minted for the hash.
          </>,
        ]}
      />

      <H2>Timeline and relationships</H2>
      <P>
        A timeline indicator shows which document was anchored first and the gap
        between them, measured in Stacks blocks and an estimated wall-clock time
        (Stacks blocks settle on Bitcoin roughly every ten minutes). Relationship
        badges summarize whether the two anchors share an owner and template
        type. When one label declares it supersedes the other (the word{" "}
        <Code>supersedes</Code> alongside a reference to the counterpart hash), a
        supersession badge is shown.
      </P>

      <H2>Shareable links and the API</H2>
      <P>
        Every comparison is a shareable URL. The <strong>Share comparison</strong>{" "}
        button copies a link with the compared hashes as query params, and
        opening it auto-runs the comparison:
      </P>
      <CodeBlock language="text">{`/compare?a=<hashA>&b=<hashB>&ownerA=<principal>&ownerB=<principal>`}</CodeBlock>
      <P>
        The same comparison is available as JSON for tooling. The response
        includes both resolved entries, the block and estimated time gap, which
        side is older, and the owner, label, source, template, and supersession
        relationships:
      </P>
      <CodeBlock language="bash">{`curl "https://thesis-lock.vercel.app/api/compare?a=<hashA>&b=<hashB>"`}</CodeBlock>
      <P>
        Responses are cached at the edge for two minutes. You can also reach the
        page from any verified anchor: the verify page links to{" "}
        <Code>/compare</Code> with that hash pre-filled, and{" "}
        <Link href="/anchors">My Anchors</Link> lets you tick two anchors and
        compare them directly.
      </P>
    </div>
  );
}
