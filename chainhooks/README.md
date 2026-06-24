# Chainhook event sync

A hosted [Hiro Chainhook](https://www.hiro.so/) watches the `thesislock` contract
(`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock`) and POSTs every
`anchor-created` event to `https://thesis-lock.vercel.app/api/chainhooks`, which
mirrors it into a Supabase table (`thesis_locks`) in real time. The payload is
reorg-aware (apply / rollback), writes are idempotent on the transaction id, and
the chain stays the source of truth. The predicate lives in
`thesislock-events.predicate.json`.

## 1. Create the Supabase table

With the Supabase CLI (applies everything in `supabase/migrations/`):

```
supabase db push
```

Or paste this into the Supabase SQL editor (identical to the migration):

```sql
create table if not exists public.thesis_locks (
  tx_id text primary key,
  block_height bigint not null,
  sender text,
  hash text,
  anchored_by text,
  stacks_block bigint,
  burn_block bigint,
  label text,
  event jsonb not null,
  reverted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists thesis_locks_hash_idx on public.thesis_locks (hash);
create index if not exists thesis_locks_anchored_by_idx on public.thesis_locks (anchored_by);
create index if not exists thesis_locks_recent_idx
  on public.thesis_locks (block_height desc) where reverted = false;

alter table public.thesis_locks enable row level security;

create policy "thesis_locks public read"
  on public.thesis_locks
  for select
  using (true);
```

## 2. Set the Vercel environment variables

In the Vercel project (Settings -> Environment Variables, Production and Preview).
None are prefixed `NEXT_PUBLIC_`, so they stay server-side only.

| Variable | Value |
| --- | --- |
| `CHAINHOOK_AUTH_TOKEN` | A long random secret you generate, e.g. `openssl rand -hex 32`. The chainhook must send it as its bearer token. |
| `SUPABASE_URL` | The project URL, `https://<project-ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings -> API -> `service_role` key. Secret; bypasses RLS. Mark it sensitive. |

Redeploy after setting them so the endpoint picks them up.

## 3. Register the predicate on the Hiro Platform

1. Sign in at [platform.hiro.so](https://platform.hiro.so/) and open Chainhooks.
2. Create a new chainhook: chain **Stacks**, network **Mainnet**.
3. Provide the predicate from `thesislock-events.predicate.json`: scope
   `print_event`, contract `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock`,
   `contains` `anchor-created`, `start_block` `7798720`, `decode_clarity_values`
   `true`.
4. Set the action to **HTTP POST** with URL
   `https://thesis-lock.vercel.app/api/chainhooks` and the authorization header to
   `Bearer <your CHAINHOOK_AUTH_TOKEN>` (the same value set in Vercel). The
   committed predicate keeps a placeholder; enter the real token only in the Hiro
   UI, never in the file.
5. Enable the chainhook. It backfills from block 7798720, then streams new events.

## 4. Smoke test

```
curl -i -X POST https://thesis-lock.vercel.app/api/chainhooks \
  -H "Authorization: Bearer $CHAINHOOK_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apply":[],"rollback":[]}'
# -> HTTP/1.1 200 ... {"ok":true}
```

A wrong or missing token returns `401`. Malformed JSON returns `400`. Any
processing or database error returns `500`, which tells Hiro to retry; because
writes upsert on `tx_id`, replays are safe.

## What gets stored

`thesis_locks` columns come from the actual contract print tuple in
`contracts/thesislock.clar`: `hash`, `anchored_by`, `stacks_block`, `burn_block`,
`label`, plus `tx_id`, `block_height`, `sender`, the full decoded tuple in
`event` (jsonb), `reverted`, and `created_at`. Reads are public via RLS; writes
go only through the service role.
