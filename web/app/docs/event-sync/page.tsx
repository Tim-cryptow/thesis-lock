import type { Metadata } from "next";
import { Code, H2, Lead, List, P, Table } from "../ui";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/event-sync" },
  title: { absolute: "Event Sync | ThesisLock Docs" },
  description:
    "How a Hiro Chainhook streams on-chain anchor events into a Supabase index in real time, with reorg-aware apply and rollback.",
};

export default function EventSyncDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Event Sync</h1>
      <Lead>
        A hosted Hiro Chainhook watches the thesislock contract and posts every
        anchor event to ThesisLock, which mirrors it into a Supabase table in real
        time, instead of polling the Hiro API for fresh anchors. The chain stays
        the source of truth; the table is a fast, queryable index.
      </Lead>

      <H2>How it works</H2>
      <List
        items={[
          <>
            The contract emits one print event, <Code>anchor-created</Code>, on
            every <Code>anchor-document</Code> call.
          </>,
          <>
            A Chainhook predicate (<Code>print_event</Code> scope,{" "}
            <Code>contains: &quot;anchor-created&quot;</Code>) matches those events
            from the deploy block onward and POSTs them to{" "}
            <Code>/api/chainhooks</Code>.
          </>,
          <>
            The endpoint checks a bearer token, then processes the reorg-aware
            payload: rollbacks first, then applies.
          </>,
          <>
            Applies upsert each event keyed on its transaction id, so redelivery
            is idempotent. Rollbacks mark the matching rows <Code>reverted</Code>.
          </>,
        ]}
      />

      <H2>What gets stored</H2>
      <P>
        The <Code>thesis_locks</Code> table mirrors the event tuple. Columns are
        named from the actual contract fields:
      </P>
      <Table
        headers={["Column", "Source"]}
        rows={[
          [<Code key="c">tx_id</Code>, "Transaction id (primary key)"],
          [<Code key="c">block_height</Code>, "Stacks block of the event"],
          [<Code key="c">sender</Code>, "Transaction sender"],
          [<Code key="c">hash</Code>, "Document hash"],
          [<Code key="c">anchored_by</Code>, "Anchoring principal"],
          [<Code key="c">stacks_block</Code>, "stacks-block from the event"],
          [<Code key="c">burn_block</Code>, "burn-block from the event"],
          [<Code key="c">label</Code>, "Optional ASCII label"],
          [<Code key="c">event</Code>, "Full decoded tuple (jsonb)"],
          [<Code key="c">reverted</Code>, "True after a rollback"],
        ]}
      />
      <P>
        Row-level security allows public reads; only the server-side service role
        writes.
      </P>

      <H2>Configuration</H2>
      <P>
        Three server-only environment variables (never <Code>NEXT_PUBLIC</Code>):
      </P>
      <List
        items={[
          <>
            <Code>CHAINHOOK_AUTH_TOKEN</Code> is the shared secret the chainhook
            presents, as a bearer token or a <Code>?token=</Code> query parameter.
          </>,
          <>
            <Code>SUPABASE_URL</Code> is the Supabase project URL.
          </>,
          <>
            <Code>SUPABASE_SERVICE_ROLE_KEY</Code> is the service-role key used for
            server writes.
          </>,
        ]}
      />
      <P>
        Full setup, the table SQL, and the Hiro Platform registration steps live
        in <Code>chainhooks/README.md</Code> in the repository.
      </P>

      <H2>Reads</H2>
      <P>
        The app&apos;s feed, stats, profile, search, and verify reads query this
        index through a browser-safe anon key (the public-read RLS policy) instead
        of polling the Hiro API on every request. If the index is unreachable, or
        a just-anchored hash has not been indexed yet, those reads fall back to
        the Hiro API, so verification never returns a false negative. Batch,
        registry, group, and proof anchors still come from Hiro. These reads use{" "}
        <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{" "}
        <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code>, distinct from the server-only
        write vars above.
      </P>
    </div>
  );
}
