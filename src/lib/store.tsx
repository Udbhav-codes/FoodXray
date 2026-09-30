"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearAiCache } from "@/lib/ai";
import { makeT } from "@/lib/i18n";
import type {
  DayLog,
  Lang,
  LogEntry,
  MealSlot,
  ScanResult,
  UserProfile,
} from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   LOCAL STORE — spec §18.1: health data is sensitive data, so the
   profile lives on the device by default. There is no cloud sync here
   and no analytics beacon. "Delete all my data" genuinely erases.
   ═══════════════════════════════════════════════════════════════════ */

const KEY = "poshanlens.v1";

export type ThemeChoice = "light" | "dark" | "system";

interface Persisted {
  lang: Lang;
  theme: ThemeChoice;
  profiles: UserProfile[];
  activeProfileId: string | null;
  history: ScanResult[];
  logs: DayLog[];
  onboarded: boolean;
  /**
   * AI features send a de-identified profile summary off the device, so this
   * is an explicit choice rather than an assumption. Everything still works
   * with it off — the deterministic rules are the fallback, not a stub.
   */
  aiEnabled: boolean;
}

const EMPTY: Persisted = {
  lang: "en",
  theme: "system",
  profiles: [],
  activeProfileId: null,
  history: [],
  logs: [],
  onboarded: false,
  aiEnabled: true,
};

export function newProfile(partial: Partial<UserProfile> = {}): UserProfile {
  const now = new Date().toISOString();
  return {
    profile_id: crypto.randomUUID(),
    is_primary: false,
    name: "",
    sex: "unspecified",
    activity_level: "moderate",
    conditions: [],
    allergies: [],
    goal: "maintain",
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface StoreValue extends Persisted {
  ready: boolean;
  t: (key: string) => string;
  activeProfile: UserProfile | null;
  setLang: (l: Lang) => void;
  setTheme: (t: ThemeChoice) => void;
  setOnboarded: (v: boolean) => void;
  setAiEnabled: (v: boolean) => void;
  saveProfile: (p: UserProfile) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  addScan: (r: ScanResult) => void;
  removeScan: (id: string) => void;
  getScan: (id: string) => ScanResult | undefined;
  addLogEntry: (slot: MealSlot, entry: Omit<LogEntry, "entry_id" | "slot" | "at">) => void;
  removeLogEntry: (date: string, entryId: string) => void;
  logFor: (date: string) => DayLog;
  wipeAll: () => void;
  exportJson: () => string;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);

  // ── Hydrate once on mount. ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        setState({ ...EMPTY, ...parsed });
      }
    } catch {
      // Corrupt or unavailable storage (private mode, cleared site data).
      // Starting fresh is the correct behaviour — never crash the app.
    }
    setReady(true);
  }, []);

  // ── Persist on change. ──
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Quota or private mode. The app keeps working in memory.
    }
  }, [state, ready]);

  // ── Reflect language and theme onto <html>. ──
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = state.lang;
  }, [state.lang, ready]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = state.theme === "dark" || (state.theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0e1a13" : "#fafcf7");
    };

    apply();
    if (state.theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [state.theme, ready]);

  const patch = useCallback((p: Partial<Persisted>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const activeProfile =
      state.profiles.find((p) => p.profile_id === state.activeProfileId) ?? null;

    return {
      ...state,
      ready,
      t: makeT(state.lang),
      activeProfile,

      setLang: (lang) => patch({ lang }),
      setTheme: (theme) => patch({ theme }),
      setOnboarded: (onboarded) => patch({ onboarded }),

      setAiEnabled: (aiEnabled) => {
        // Turning AI off also drops anything it generated, so "off" means
        // off rather than "off but still showing yesterday's AI text".
        if (!aiEnabled) clearAiCache();
        patch({ aiEnabled });
      },

      saveProfile: (p) => {
        setState((s) => {
          const updated = { ...p, updated_at: new Date().toISOString() };
          const exists = s.profiles.some((x) => x.profile_id === p.profile_id);
          const profiles = exists
            ? s.profiles.map((x) => (x.profile_id === p.profile_id ? updated : x))
            : [...s.profiles, updated];
          // The first profile created is the primary one and becomes active.
          const isFirst = s.profiles.length === 0;
          return {
            ...s,
            profiles: isFirst ? [{ ...updated, is_primary: true }] : profiles,
            activeProfileId: s.activeProfileId ?? updated.profile_id,
          };
        });
      },

      removeProfile: (id) => {
        setState((s) => {
          const profiles = s.profiles.filter((p) => p.profile_id !== id);
          return {
            ...s,
            profiles,
            activeProfileId:
              s.activeProfileId === id ? (profiles[0]?.profile_id ?? null) : s.activeProfileId,
          };
        });
      },

      setActiveProfile: (activeProfileId) => patch({ activeProfileId }),

      addScan: (r) => {
        setState((s) => ({
          ...s,
          // Cap history so localStorage never fills up on a low-end device.
          history: [r, ...s.history.filter((h) => h.scan_id !== r.scan_id)].slice(0, 60),
        }));
      },

      removeScan: (id) =>
        setState((s) => ({ ...s, history: s.history.filter((h) => h.scan_id !== id) })),

      getScan: (id) => state.history.find((h) => h.scan_id === id),

      addLogEntry: (slot, entry) => {
        setState((s) => {
          const date = todayKey();
          const full: LogEntry = {
            ...entry,
            entry_id: crypto.randomUUID(),
            slot,
            at: new Date().toISOString(),
          };
          const existing = s.logs.find((l) => l.date === date);
          const logs = existing
            ? s.logs.map((l) =>
                l.date === date ? { ...l, entries: [...l.entries, full] } : l
              )
            : [...s.logs, { date, entries: [full] }];
          return { ...s, logs: logs.slice(-90) };
        });
      },

      removeLogEntry: (date, entryId) => {
        setState((s) => ({
          ...s,
          logs: s.logs.map((l) =>
            l.date === date
              ? { ...l, entries: l.entries.filter((e) => e.entry_id !== entryId) }
              : l
          ),
        }));
      },

      logFor: (date) => state.logs.find((l) => l.date === date) ?? { date, entries: [] },

      wipeAll: () => {
        try {
          localStorage.removeItem(KEY);
          clearAiCache();
        } catch {
          /* nothing more we can do */
        }
        setState({ ...EMPTY, lang: state.lang, theme: state.theme, onboarded: true });
      },

      exportJson: () => JSON.stringify(state, null, 2),
    };
  }, [state, ready, patch]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
