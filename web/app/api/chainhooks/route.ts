import { timingSafeEqual } from "node:crypto";
import { corsHeaders } from "@/lib/verify";
import { getSupabaseAdmin } from "@/lib/supabase";
import { decodeAnchorTuple, type DecodedAnchor } from "@/lib/chainhookDecode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The contract whose print events we ingest, built from the same env defaults the
// rest of the app uses so a contract move only changes one place.
const CONTRACT_ID = `${
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM"
}.${process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock"}`;

// The only event thesislock emits (see contracts/thesislock.clar).
const EVENT_TOPIC = "anchor-created";

// Minimal shape of the Hiro Chainhook Stacks payload we rely on. Everything is
// runtime-guarded below; these types are for readability only.
type ChainhookEvent = {
  type?: string;
  data?: { contract_identifier?: string; topic?: string; value?: unknown };
};

type ChainhookTransaction = {
  transaction_identifier?: { hash?: string };
  metadata?: {
    success?: boolean;
    sender?: string;
    receipt?: { events?: ChainhookEvent[] };
  };
};

type ChainhookBlock = {
  block_identifier?: { index?: number; hash?: string };
  transactions?: ChainhookTransaction[];
};

type ChainhookPayload = {
  apply?: ChainhookBlock[];
  rollback?: ChainhookBlock[];
};

type AnchorRow = {
  tx_id: string;
  block_height: number;
  sender: string | null;
  hash: string | null;
  anchored_by: string | null;
  stacks_block: number | null;
  burn_block: number | null;
  label: string | null;
  event: unknown;
  reverted: boolean;
};

// Length-safe, timing-safe Bearer comparison. timingSafeEqual throws on
// unequal-length buffers, so guard the length first.
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders() });
}

function toRow(
  txId: string,
  blockHeight: number,
  tx: ChainhookTransaction,
  decoded: DecodedAnchor,
): AnchorRow {
  return {
    tx_id: txId,
    block_height: blockHeight,
    sender: tx.metadata?.sender ?? null,
    hash: decoded.hash,
    anchored_by: decoded.anchoredBy,
    stacks_block: decoded.stacksBlock,
    burn_block: decoded.burnBlock,
    label: decoded.label,
    event: decoded.raw,
    reverted: false,
  };
}

// Pull anchor-created rows from a block. Skips failed transactions and any event
// that is not our contract's print of the expected topic.
function anchorRowsFromBlock(block: ChainhookBlock): AnchorRow[] {
  const blockHeight = block.block_identifier?.index ?? 0;
  const rows: AnchorRow[] = [];
  for (const tx of block.transactions ?? []) {
    if (tx.metadata?.success === false) continue;
    const txId = tx.transaction_identifier?.hash;
    if (!txId) continue;
    for (const event of tx.metadata?.receipt?.events ?? []) {
      if (event.type !== "SmartContractEvent") continue;
      const data = event.data;
      if (!data || data.contract_identifier !== CONTRACT_ID) continue;
      if (data.topic !== "print") continue;
      const decoded = decodeAnchorTuple(data.value);
      if (!decoded || decoded.event !== EVENT_TOPIC) continue;
      rows.push(toRow(txId, blockHeight, tx, decoded));
    }
  }
  return rows;
}

export async function POST(req: Request) {
  // Verify the shared secret before any work.
  const expected = process.env.CHAINHOOK_AUTH_TOKEN;
  if (!expected) {
    // Misconfiguration: fail loud and retryable rather than silently dropping.
    return json({ ok: false, error: "Server not configured." }, 500);
  }
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Also accept the token as a ?token= query param: the hosted Hiro Platform
  // builder cannot send a custom Authorization header, so the secret rides on
  // the endpoint URL instead. The Chainhook CLI / self-hosted node can still use
  // the Bearer header.
  const queryToken = new URL(req.url).searchParams.get("token") ?? "";
  const provided = bearer || queryToken;
  if (!provided || !tokenMatches(provided, expected)) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  let payload: ChainhookPayload;
  try {
    payload = (await req.json()) as ChainhookPayload;
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  try {
    // Rollback before apply: if a reorg both rolls back and re-applies a tx, the
    // apply pass below restores reverted=false, leaving the correct final state.
    const rolledBack = (payload.rollback ?? [])
      .flatMap(anchorRowsFromBlock)
      .map((row) => row.tx_id);
    const rows = (payload.apply ?? []).flatMap(anchorRowsFromBlock);

    // Nothing relevant in this delivery (true for most blocks): acknowledge
    // without touching the database, so a no-op never depends on Supabase.
    if (rolledBack.length === 0 && rows.length === 0) {
      return json({ ok: true });
    }

    const supabase = getSupabaseAdmin();

    if (rolledBack.length > 0) {
      const { error } = await supabase
        .from("thesis_locks")
        .update({ reverted: true })
        .in("tx_id", rolledBack);
      if (error) throw error;
    }

    // Apply: idempotent upsert keyed on tx_id, so redelivery is a safe no-op.
    if (rows.length > 0) {
      const { error } = await supabase
        .from("thesis_locks")
        .upsert(rows, { onConflict: "tx_id" });
      if (error) throw error;
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Chainhook processing failed:", err);
    // 500 so Hiro retries; the upserts make a full replay safe.
    return json({ ok: false, error: "Processing failed." }, 500);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
