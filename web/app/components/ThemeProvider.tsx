"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "thesislock.theme";
const MODES: ThemeMode[] = ["system", "light", "dark"];

type ThemeContextValue = {
  // The user's chosen mode, including "system".
  mode: ThemeMode;
  // The actually-applied theme after resolving "system".
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  // Cycles system -> light -> dark -> system.
  cycle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveMode(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

function applyResolved(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start from "system" on both server and first client render so markup
  // matches; the real stored preference is read in the mount effect. The
  // pre-paint script in <head> has already applied the correct class, so there
  // is no visible flash before this runs.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    let stored: ThemeMode | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (isThemeMode(raw)) stored = raw;
    } catch {
      // localStorage can throw in private mode; fall back to system.
    }
    setPrefersDark(systemPrefersDark());
    if (stored) setModeState(stored);
  }, []);

  // Track OS preference changes so "system" mode stays in sync live.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveMode(mode, prefersDark);

  useEffect(() => {
    applyResolved(resolved);
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal if persistence is unavailable.
    }
  }, []);

  const cycle = useCallback(() => {
    setModeState((current) => {
      const next = MODES[(MODES.indexOf(current) + 1) % MODES.length]!;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Non-fatal.
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, cycle }),
    [mode, resolved, setMode, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
