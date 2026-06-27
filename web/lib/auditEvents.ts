// Fire-and-forget audit dispatch. Components call these helpers to record an
// action; the AuditLogger mounted in the layout listens for the event and writes
// the entry, filling in the actor, session, and user agent. Decoupling this way
// keeps call sites trivial and the recording logic in one place, and means a
// component never imports the storage layer just to note that something happened.

export const AUDIT_EVENT = "thesislock:audit";

export type AuditEventDetail = {
  action: string;
  category: string;
  target: string | null;
  metadata: Record<string, unknown>;
};

export function dispatchAudit(
  action: string,
  category: string,
  target?: string | null,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<AuditEventDetail>(AUDIT_EVENT, {
        detail: {
          action,
          category,
          target: target ?? null,
          metadata: metadata ?? {},
        },
      }),
    );
  } catch {
    // Non-fatal: auditing never blocks the action it records.
  }
}

// Convenience wrappers for the common actions, so call sites read clearly and
// the action names and categories stay consistent across the app.

export function auditAnchor(hash: string, metadata?: Record<string, unknown>): void {
  dispatchAudit("anchor_submit", "anchor", hash, metadata);
}

export function auditBatchAnchor(entries: { hash: string; label: string }[], txId?: string): void {
  dispatchAudit("batch_anchor", "anchor", null, {
    count: entries.length,
    hashes: entries.map((e) => e.hash),
    labels: entries.map((e) => e.label),
    txId,
  });
}

export function auditVerify(hash: string, metadata?: Record<string, unknown>): void {
  dispatchAudit("verify_check", "verify", hash, metadata);
}

export function auditProofMint(hash: string, txId?: string): void {
  dispatchAudit("proof_mint", "proof", hash, txId ? { txId } : undefined);
}

export function auditSearch(query: string, type?: string): void {
  dispatchAudit("search", "search", null, { query, type: type ?? "auto" });
}

export function auditExport(format: string, metadata?: Record<string, unknown>): void {
  dispatchAudit("export", "export", null, { format, ...metadata });
}

export function auditCertificateDownload(hash?: string | null): void {
  dispatchAudit("certificate_download", "export", hash ?? null);
}

export function auditReportGenerate(metadata?: Record<string, unknown>): void {
  dispatchAudit("report_generate", "export", null, metadata);
}

// One helper for every group action (group_create, member_add, member_remove,
// group_anchor), keyed by the group id, so the group pages stay terse.
export function auditGroupAction(
  action: string,
  groupId: string | number,
  metadata?: Record<string, unknown>,
): void {
  dispatchAudit(action, "group", String(groupId), metadata);
}

export function auditCollectionCreate(name?: string | null): void {
  dispatchAudit("collection_create", "system", name ?? null);
}

export function auditWalletConnect(address: string): void {
  dispatchAudit("wallet_connect", "system", address, { address });
}

export function auditWalletDisconnect(address?: string | null): void {
  dispatchAudit("wallet_disconnect", "system", address ?? null, address ? { address } : undefined);
}
