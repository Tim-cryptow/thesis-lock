"use client";

import { useEffect, useState } from "react";
import { useTheme, type ThemeMode } from "@/app/components/ThemeProvider";
import { useI18n } from "@/app/components/I18nProvider";
import {
  useLive,
  getLiveInterval,
  setLiveInterval,
  LIVE_INTERVALS,
} from "@/app/components/LiveProvider";
import {
  isPerfDebugEnabled,
  setPerfDebugEnabled,
} from "@/app/components/performance/PerformanceBanner";
import { isTickerHidden, setTickerHidden } from "@/app/components/LiveTicker";
import { useTour } from "@/app/components/TourProvider";
import { resetTour } from "@/lib/onboarding";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import {
  loadPreferences,
  savePreferences,
  requestBrowserPermission,
  type NotificationPreferences,
  type NotificationType,
  NOTIFICATION_TYPES,
} from "@/lib/notifications";
import { TEMPLATES, getDefaultTemplateId, setDefaultTemplateId } from "@/lib/templates";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  tx_confirmed: "Transaction confirmed",
  tx_failed: "Transaction failed",
  watchlist_update: "Watchlist updates",
  new_anchor: "New anchors",
  group_invite: "Group invites",
  proof_minted: "Proof minted",
  system: "System messages",
};

function intervalLabel(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-emerald-500" : "bg-foreground/25"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-foreground/15 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`rounded px-3 py-1.5 text-sm transition ${
              active ? "bg-heading text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-foreground/10 bg-card p-5">
      <h2 className="text-xl mb-1">{title}</h2>
      {description ? (
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">{description}</p>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {hint ? <div className="text-xs text-foreground/55">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function PreferencesSection() {
  const { mode, setMode } = useTheme();
  const { locale, setLocale } = useI18n();
  const { paused, pause, resume } = useLive();
  const { startTour } = useTour();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [interval, setIntervalState] = useState<number>(LIVE_INTERVALS[0]);
  const [perfDebug, setPerfDebug] = useState(false);
  const [tickerHidden, setTickerHiddenState] = useState(false);
  const [defaultTemplate, setDefaultTemplate] = useState("generic");

  useEffect(() => {
    setPrefs(loadPreferences());
    setIntervalState(getLiveInterval());
    setPerfDebug(isPerfDebugEnabled());
    setTickerHiddenState(isTickerHidden());
    setDefaultTemplate(getDefaultTemplateId());
  }, []);

  const updatePrefs = (next: NotificationPreferences) => {
    setPrefs(next);
    savePreferences(next);
  };

  const toggleType = (type: NotificationType) => {
    if (!prefs) return;
    updatePrefs({
      ...prefs,
      types: { ...prefs.types, [type]: !prefs.types[type] },
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-foreground/70 max-w-2xl">
        Every preference here is saved to this browser immediately as you change it.
      </p>

      <SettingCard title="Appearance" description="Theme and language for the interface.">
        <Row label="Theme">
          <Segmented ariaLabel="Theme" value={mode} options={THEME_OPTIONS} onChange={setMode} />
        </Row>
        <Row label="Language">
          <Segmented
            ariaLabel="Language"
            value={locale}
            options={LOCALES.map((code: Locale) => ({
              value: code,
              label: LOCALE_NAMES[code],
            }))}
            onChange={setLocale}
          />
        </Row>
      </SettingCard>

      <SettingCard
        title="Notifications"
        description="Control the in-app notification center and how you are alerted."
      >
        {prefs ? (
          <>
            <Row label="Enable notifications">
              <Switch
                label="Enable notifications"
                checked={prefs.enabled}
                onChange={(v) => updatePrefs({ ...prefs, enabled: v })}
              />
            </Row>
            <Row
              label="Browser push"
              hint="Show desktop notifications when the tab is in the background."
            >
              <Switch
                label="Browser push"
                checked={prefs.browserPush}
                onChange={(v) => {
                  if (v) void requestBrowserPermission();
                  updatePrefs({ ...prefs, browserPush: v });
                }}
              />
            </Row>
            <Row label="Sound" hint="Play a short sound on new notifications.">
              <Switch
                label="Sound"
                checked={prefs.sound}
                onChange={(v) => updatePrefs({ ...prefs, sound: v })}
              />
            </Row>

            <fieldset className="border-t border-foreground/10 pt-4">
              <legend className="text-sm text-foreground/55 mb-2">Notify me about</legend>
              <div className="flex flex-col gap-3">
                {NOTIFICATION_TYPES.map((type) => (
                  <Row key={type} label={TYPE_LABELS[type]}>
                    <Switch
                      label={TYPE_LABELS[type]}
                      checked={prefs.types[type]}
                      onChange={() => toggleType(type)}
                    />
                  </Row>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <p className="text-sm text-foreground/55">Loading preferences...</p>
        )}
      </SettingCard>

      <SettingCard
        title="Live updates"
        description="The real-time event ticker and auto-updating pages."
      >
        <Row label="Enable live updates">
          <Switch
            label="Enable live updates"
            checked={!paused}
            onChange={(v) => (v ? resume() : pause())}
          />
        </Row>
        <Row label="Polling interval" hint="Takes effect after a reload.">
          <Segmented
            ariaLabel="Polling interval"
            value={interval}
            options={LIVE_INTERVALS.map((ms) => ({
              value: ms,
              label: intervalLabel(ms),
            }))}
            onChange={(ms) => {
              setIntervalState(ms);
              setLiveInterval(ms);
            }}
          />
        </Row>
        <Row label="Show ticker bar">
          <Switch
            label="Show ticker bar"
            checked={!tickerHidden}
            onChange={(v) => {
              setTickerHiddenState(!v);
              setTickerHidden(!v);
            }}
          />
        </Row>
      </SettingCard>

      <SettingCard
        title="Interface"
        description="Optional on-screen tools and the onboarding tour."
      >
        <Row
          label="Performance debug banner"
          hint="A small overlay with live LCP, CLS, and load time."
        >
          <Switch
            label="Performance debug banner"
            checked={perfDebug}
            onChange={(v) => {
              setPerfDebug(v);
              setPerfDebugEnabled(v);
            }}
          />
        </Row>
        <Row label="Onboarding tour" hint="Replay the guided walkthrough.">
          <button
            type="button"
            onClick={() => {
              resetTour();
              startTour();
            }}
            className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm transition hover:border-foreground/40"
          >
            Restart tour
          </button>
        </Row>
      </SettingCard>

      <SettingCard title="Anchoring" description="Defaults applied when you anchor a new document.">
        <Row label="Default anchor template">
          <select
            value={defaultTemplate}
            onChange={(e) => {
              setDefaultTemplate(e.target.value);
              setDefaultTemplateId(e.target.value);
            }}
            className="rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-foreground/40"
          >
            {TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </Row>
      </SettingCard>
    </div>
  );
}
