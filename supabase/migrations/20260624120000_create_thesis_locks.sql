-- thesis_locks: a Supabase mirror of the thesislock contract's anchor-created
-- events, populated by the Hiro Chainhook at /api/chainhooks. The chain remains
-- the source of truth; this table is a queryable, real-time index.
--
-- Columns named from the actual contract print tuple
-- (contracts/thesislock.clar): { event, hash, anchored-by, stacks-block,
-- burn-block, label }. There is no lock/reveal or unlock height.

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

-- Read-path indexes: by document hash (verification lookups), by wallet
-- (per-principal history), and a recent-first partial index over live rows.
create index if not exists thesis_locks_hash_idx on public.thesis_locks (hash);
create index if not exists thesis_locks_anchored_by_idx on public.thesis_locks (anchored_by);
create index if not exists thesis_locks_recent_idx
  on public.thesis_locks (block_height desc) where reverted = false;

-- Public read, service-role-only writes. The service-role key used by the
-- chainhook route bypasses RLS, so no write policy is needed (and none is added,
-- which keeps anon/auth clients read-only).
alter table public.thesis_locks enable row level security;

create policy "thesis_locks public read"
  on public.thesis_locks
  for select
  using (true);
