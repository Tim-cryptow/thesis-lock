"use client";

import { useEffect, useRef } from "react";
import { loadPreferences, NOTIFICATION_ADDED_EVENT } from "@/lib/notifications";

// At most one chime per this window, even if several notifications land at once.
const MIN_INTERVAL_MS = 3000;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  const w = window as typeof window & {
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

// A short, pleasant two-tone chime synthesized from oscillator nodes. No audio
// files are shipped or fetched.
function playChime(ctx: AudioContext): void {
  const start = ctx.currentTime;
  const tone = (frequency: number, offset: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, start + offset);
    // Quick attack, gentle exponential decay. exponentialRamp cannot reach 0,
    // so floor at a tiny value.
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.14, start + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + offset);
    osc.stop(start + offset + duration + 0.02);
  };
  tone(660, 0, 0.09);
  tone(880, 0.06, 0.13);
}

// Invisible component: plays the chime when a new notification arrives, if the
// sound preference is on and the tab is visible. Debounced.
export default function NotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef(0);

  useEffect(() => {
    const onAdded = () => {
      const prefs = loadPreferences();
      if (!prefs.enabled || !prefs.sound) return;
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastPlayedRef.current < MIN_INTERVAL_MS) return;
      lastPlayedRef.current = now;
      try {
        const Ctor = getAudioContextCtor();
        if (!Ctor) return;
        let ctx = ctxRef.current;
        if (!ctx) {
          ctx = new Ctor();
          ctxRef.current = ctx;
        }
        // Browsers may keep the context suspended until a user gesture; resume
        // best effort so the chime plays once the user has interacted.
        if (ctx.state === "suspended") void ctx.resume();
        playChime(ctx);
      } catch {
        // Web Audio may be unavailable or blocked; non-fatal.
      }
    };
    window.addEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
    return () => window.removeEventListener(NOTIFICATION_ADDED_EVENT, onAdded);
  }, []);

  useEffect(() => {
    return () => {
      try {
        void ctxRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
