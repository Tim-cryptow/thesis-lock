"use client";

import { useEffect, useState } from "react";
import {
  INCIDENTS_CHANGED_EVENT,
  loadIncidents,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/lib/incidents";

const SEVERITY: Record<IncidentSeverity, { label: string; cls: string }> = {
  critical: {
    label: "Critical",
    cls: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  major: {
    label: "Major",
    cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  minor: {
    label: "Minor",
    cls: "border-foreground/20 bg-foreground/5 text-foreground/70",
  },
};

const STAGES: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];

const STAGE_LABEL: Record<IncidentStatus, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function fmtDateHeading(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
}

function formatDuration(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "under a minute";
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rem = mins % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (rem && !days) parts.push(`${rem}m`);
  return parts.join(" ") || `${rem}m`;
}

function StageTimeline({ incident }: { incident: Incident }) {
  const reached = new Set(incident.updates.map((u) => u.status));
  reached.add(incident.status);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {STAGES.map((stage) => {
        const on = reached.has(stage);
        const dot = on
          ? stage === "resolved"
            ? "bg-emerald-500"
            : "bg-amber-500"
          : "bg-foreground/20";
        return (
          <span
            key={stage}
            className={`inline-flex items-center gap-1.5 text-xs ${
              on ? "text-foreground" : "text-foreground/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {STAGE_LABEL[stage]}
          </span>
        );
      })}
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const sev = SEVERITY[incident.severity];
  const resolved = incident.status === "resolved";
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sev.cls}`}>
            {sev.label}
          </span>
          <h4 className="font-medium truncate">{incident.title}</h4>
        </div>
        <span className="text-xs text-foreground/50">
          {resolved && incident.resolvedAt
            ? `Resolved in ${formatDuration(incident.createdAt, incident.resolvedAt)}`
            : STAGE_LABEL[incident.status]}
        </span>
      </div>

      {incident.affectedServices.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {incident.affectedServices.map((service) => (
            <span
              key={service}
              className="rounded bg-foreground/5 px-1.5 py-0.5 text-xs font-mono text-foreground/70"
            >
              {service}
            </span>
          ))}
        </div>
      ) : null}

      <StageTimeline incident={incident} />

      <ol className="mt-3 space-y-2 border-t border-foreground/10 pt-3">
        {[...incident.updates].reverse().map((update, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="uppercase tracking-wide">{update.status}</span>
              <span>{fmtDateTime(update.timestamp)}</span>
            </div>
            <p className="text-foreground/80">{update.message}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function IncidentTimeline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const sync = () => setIncidents(loadIncidents());
    sync();
    window.addEventListener(INCIDENTS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(INCIDENTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const active = incidents
    .filter((i) => i.status !== "resolved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const weekAgo = Date.now() - WEEK_MS;
  const past = incidents
    .filter(
      (i) =>
        i.status === "resolved" &&
        i.resolvedAt !== null &&
        new Date(i.resolvedAt).getTime() >= weekAgo,
    )
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""));

  const groups = new Map<string, Incident[]>();
  for (const incident of past) {
    const key = fmtDateHeading(incident.resolvedAt ?? incident.updatedAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(incident);
    else groups.set(key, [incident]);
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50 mb-3">
        Incidents
      </h2>

      {active.length > 0 ? (
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Active
          </h3>
          {active.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      ) : null}

      {active.length === 0 && past.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-6">
          <p className="font-medium">No incidents reported</p>
          <p className="text-sm text-foreground/50 mt-1">
            All services have been operating normally over the last 7 days.
          </p>
          <div className="mt-3 flex items-stretch gap-1.5 h-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="flex-1 rounded-sm bg-emerald-500/70" />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-foreground/40">
            <span>7 days ago</span>
            <span>today</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {past.length === 0 ? (
            <p className="text-sm text-foreground/50">No resolved incidents in the last 7 days.</p>
          ) : (
            Array.from(groups.entries()).map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-2">
                  {day}
                </h3>
                <div className="space-y-3">
                  {items.map((incident) => (
                    <IncidentCard key={incident.id} incident={incident} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
