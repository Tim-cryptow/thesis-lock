// Best-effort, in-memory status history for the API. The project has no
// database, so this ring buffer lives in the server instance's memory: it is
// per-instance and ephemeral, lost on cold start. Durable, per-visitor history
// is kept in the browser by statusMonitor's localStorage helpers. This exists so
// /api/status/history can return the recent snapshots an instance has observed.

import type {
  ServiceStatus,
  StatusHistory,
  StatusHistoryCheck,
} from "./statusMonitor";

type Snapshot = { timestamp: string; services: ServiceStatus[] };

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS = 500;

const snapshots: Snapshot[] = [];

export function recordServerSnapshot(
  services: ServiceStatus[],
  timestamp: string,
): void {
  snapshots.push({ timestamp, services });
  const cutoff = Date.now() - WINDOW_MS;
  let drop = 0;
  while (
    drop < snapshots.length &&
    new Date(snapshots[drop].timestamp).getTime() < cutoff
  ) {
    drop += 1;
  }
  if (drop > 0) snapshots.splice(0, drop);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }
}

// Reshapes the recent snapshots into per-service histories, matching the shape
// the status page uses client-side.
export function getServerHistories(): StatusHistory[] {
  const cutoff = Date.now() - WINDOW_MS;
  const byService = new Map<string, StatusHistoryCheck[]>();
  for (const snap of snapshots) {
    if (new Date(snap.timestamp).getTime() < cutoff) continue;
    for (const s of snap.services) {
      const checks = byService.get(s.name) ?? [];
      checks.push({
        timestamp: snap.timestamp,
        status: s.status,
        responseTime: s.responseTime,
      });
      byService.set(s.name, checks);
    }
  }
  return Array.from(byService, ([service, checks]) => ({ service, checks }));
}
