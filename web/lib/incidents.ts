// Incident tracking for the status page. Incidents are stored in the browser
// (no backend), can be opened and updated by hand, and are also reconciled
// automatically against the latest health check: a service going down opens an
// incident, and its recovery resolves it. Manual incidents are never touched by
// the automation.

import type { ServiceCategory, ServiceStatus } from "./statusMonitor";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export type IncidentSeverity = "minor" | "major" | "critical";

export type IncidentUpdate = {
  message: string;
  status: string;
  timestamp: string;
};

export type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
  affectedServices: string[];
};

const INCIDENTS_KEY = "thesislock_incidents";

// Dispatched whenever incidents change so the timeline stays live.
export const INCIDENTS_CHANGED_EVENT = "thesislock:incidents-changed";

// Auto-detected incidents use a stable id keyed by service, so each service has
// at most one open auto-incident and recovery resolves exactly that one without
// touching anything a person opened.
const AUTO_PREFIX = "auto:";

// Resolved incidents are retained this long, then dropped on the next save to
// keep storage bounded. The timeline itself shows the last seven days.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const INCIDENT_STATUSES: IncidentStatus[] = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
];

function isIncidentStatus(value: string): value is IncidentStatus {
  return (INCIDENT_STATUSES as string[]).includes(value);
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the time-based id.
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function coerceUpdate(value: unknown): IncidentUpdate | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.message !== "string" || typeof v.status !== "string") return null;
  if (typeof v.timestamp !== "string") return null;
  return { message: v.message, status: v.status, timestamp: v.timestamp };
}

function coerceIncident(value: unknown): Incident | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.title !== "string") return null;
  if (typeof v.status !== "string" || !isIncidentStatus(v.status)) return null;
  const severity: IncidentSeverity =
    v.severity === "critical" || v.severity === "major" ? v.severity : "minor";
  const updates = Array.isArray(v.updates)
    ? v.updates.map(coerceUpdate).filter((u): u is IncidentUpdate => u !== null)
    : [];
  const affectedServices = Array.isArray(v.affectedServices)
    ? v.affectedServices.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id: v.id,
    title: v.title,
    status: v.status,
    severity,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : nowIso(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : nowIso(),
    resolvedAt: typeof v.resolvedAt === "string" ? v.resolvedAt : null,
    updates,
    affectedServices,
  };
}

export function loadIncidents(): Incident[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INCIDENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerceIncident)
      .filter((i): i is Incident => i !== null);
  } catch {
    return [];
  }
}

export function saveIncidents(incidents: Incident[]): void {
  if (typeof window === "undefined") return;
  try {
    const cutoff = Date.now() - RETENTION_MS;
    const kept = incidents.filter(
      (i) =>
        i.status !== "resolved" ||
        !i.resolvedAt ||
        new Date(i.resolvedAt).getTime() >= cutoff,
    );
    window.localStorage.setItem(INCIDENTS_KEY, JSON.stringify(kept));
    window.dispatchEvent(new CustomEvent(INCIDENTS_CHANGED_EVENT));
  } catch {
    // Persisting is best-effort; a failure never blocks the page.
  }
}

function buildIncident(
  id: string,
  title: string,
  severity: IncidentSeverity,
  services: string[],
  message: string,
  status: IncidentStatus = "investigating",
): Incident {
  const ts = nowIso();
  return {
    id,
    title,
    status,
    severity,
    createdAt: ts,
    updatedAt: ts,
    resolvedAt: status === "resolved" ? ts : null,
    updates: [{ message, status, timestamp: ts }],
    affectedServices: services,
  };
}

export function createIncident(
  title: string,
  severity: IncidentSeverity,
  services: string[],
  message: string,
): Incident {
  const incident = buildIncident(randomId(), title, severity, services, message);
  const incidents = loadIncidents();
  incidents.push(incident);
  saveIncidents(incidents);
  return incident;
}

export function updateIncident(
  id: string,
  message: string,
  status: string,
): void {
  const incidents = loadIncidents();
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return;
  const ts = nowIso();
  const next = isIncidentStatus(status) ? status : incident.status;
  incident.status = next;
  incident.updatedAt = ts;
  incident.updates.push({ message, status: next, timestamp: ts });
  if (next === "resolved" && !incident.resolvedAt) {
    incident.resolvedAt = ts;
  }
  saveIncidents(incidents);
}

export function resolveIncident(id: string, message: string): void {
  const incidents = loadIncidents();
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return;
  const ts = nowIso();
  incident.status = "resolved";
  incident.resolvedAt = ts;
  incident.updatedAt = ts;
  incident.updates.push({ message, status: "resolved", timestamp: ts });
  saveIncidents(incidents);
}

function severityForCategory(category: ServiceCategory): IncidentSeverity {
  if (category === "dependency") return "critical";
  if (category === "contract") return "major";
  return "minor";
}

// Reconciles auto-detected incidents against the latest check. A service that is
// down with no open auto-incident opens one; an open auto-incident whose service
// is confirmed reachable again (operational or degraded) is resolved. A service
// in an unknown state leaves its incident unchanged, so a flaky measurement does
// not open or close one prematurely. Returns the full, updated incident list.
export function reconcileIncidents(statuses: ServiceStatus[]): Incident[] {
  if (typeof window === "undefined") return [];
  const incidents = loadIncidents();
  const ts = nowIso();
  let changed = false;

  const openAuto = new Map<string, Incident>();
  for (const incident of incidents) {
    if (incident.id.startsWith(AUTO_PREFIX) && incident.status !== "resolved") {
      openAuto.set(incident.id, incident);
    }
  }

  for (const s of statuses) {
    if (s.status !== "down") continue;
    const id = `${AUTO_PREFIX}${s.name}`;
    if (openAuto.has(id)) continue;
    incidents.push(
      buildIncident(
        id,
        `${s.name} unavailable`,
        severityForCategory(s.category),
        [s.name],
        s.message
          ? `Automated monitoring detected ${s.name} is down (${s.message}).`
          : `Automated monitoring detected ${s.name} is down.`,
      ),
    );
    changed = true;
  }

  const statusByName = new Map(statuses.map((s) => [s.name, s.status]));
  for (const [id, incident] of openAuto) {
    const service = id.slice(AUTO_PREFIX.length);
    const current = statusByName.get(service);
    if (current === "operational" || current === "degraded") {
      incident.status = "resolved";
      incident.resolvedAt = ts;
      incident.updatedAt = ts;
      incident.updates.push({
        message: `Automated monitoring confirmed ${service} has recovered.`,
        status: "resolved",
        timestamp: ts,
      });
      changed = true;
    }
  }

  if (changed) saveIncidents(incidents);
  return incidents;
}
