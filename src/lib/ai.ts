"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Nutrition, ResolvedIngredient, ScanResult, UserProfile } from "@/lib/types";
import { ALLERGEN_META, CONDITION_META, nutrientLoads } from "@/lib/personalise";

/* ═══════════════════════════════════════════════════════════════════
   CLIENT AI LAYER

   Two principles run through all of this:

   1. AI is an ENHANCEMENT, never a dependency. Every call has a
      deterministic fallback already on screen. If the key is missing, the
      network is down, or Gemini times out, the app keeps working exactly
      as it did before — the user just sees the rule-written text.

   2. We send the minimum. The profile is health data (spec §18.1), so
      names never leave the device and age is coarsened to a band. The
      user can switch AI off entirely in Settings.
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_PREFIX = "foodxray.ai.";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; e: number };
    if (Date.now() > parsed.e) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T, ttl = CACHE_TTL) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ v: value, e: Date.now() + ttl })
    );
  } catch {
    // Quota full or private mode. The in-memory result is still fine.
  }
}

export function clearAiCache() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to do */
  }
}

/* ─────────────────────── De-identification ───────────────────────── */

/**
 * Health data minimisation. The name never leaves the device, and exact
 * age becomes a band — enough for the model to pitch its language, not
 * enough to identify anyone.
 */
export function slimProfile(profile: UserProfile | null) {
  if (!profile) return null;
  return {
    ageBand: profile.age ? ageBand(profile.age) : undefined,
    conditions: profile.conditions.map((c) => CONDITION_META[c].label_en),
    allergies: profile.allergies.map((a) => ALLERGEN_META[a].label_en),
    goal: profile.goal?.replace(/_/g, " "),
  };
}

function ageBand(age: number): string {
  if (age < 13) return "child";
  if (age < 20) return "teenager";
  if (age < 35) return "20s-30s";
  if (age < 50) return "35-50";
  if (age < 65) return "50-65";
  return "over 65";
}

/* ───────────────────────────── Status ───────────────────────────── */

let statusPromise: Promise<boolean> | null = null;

export function aiAvailable(): Promise<boolean> {
  if (!statusPromise) {
    statusPromise = fetch("/api/status")
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((d) => Boolean(d.ai))
      .catch(() => false);
  }
  return statusPromise;
}

export function useAiAvailable(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    aiAvailable().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Network, abort, or malformed response — the caller keeps its fallback.
    return null;
  }
}

/* ─────────────────── Hook: personal explanation ─────────────────── */

export type AiState = "idle" | "loading" | "done" | "unavailable";

/**
 * Swaps the rule-written explanation for a Gemini one. `fallback` is what
 * the rules already produced, and it is what stays on screen the whole time
 * the request is in flight — so there is never a spinner where the answer
 * should be.
 */
export function useAiExplanation(
  scan: ScanResult | undefined,
  items: ResolvedIngredient[],
  profile: UserProfile | null,
  lang: "en" | "hi",
  fallback: string,
  enabled: boolean
): { text: string; state: AiState; isAi: boolean } {
  const [text, setText] = useState(fallback);
  const [state, setState] = useState<AiState>("idle");
  const [isAi, setIsAi] = useState(false);

  // Keep showing the rule text whenever the fallback itself changes
  // (language switch, profile switch) until AI catches up.
  useEffect(() => {
    setText(fallback);
    setIsAi(false);
  }, [fallback]);

  useEffect(() => {
    if (!scan || !enabled) {
      setState(enabled ? "idle" : "unavailable");
      return;
    }

    const verdict = scan.verdicts.find(
      (v) => v.profileId === (profile?.profile_id ?? "default")
    );
    if (!verdict) return;

    const key = `explain.${scan.scan_id}.${profile?.profile_id ?? "default"}.${lang}`;
    const cached = readCache<string>(key);
    if (cached) {
      setText(cached);
      setIsAi(true);
      setState("done");
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setState("loading");

    const flagged = items
      .filter((i) => i.personalNote_en && i.ingredient)
      .slice(0, 6)
      .map((i) => ({
        name: i.ingredient!.name_en,
        reason: i.personalNote_en!,
      }));

    // Ingredients the rules dislike, even when nothing personal fired.
    const concerns = items
      .filter((i) => i.verdict === "avoid" && i.ingredient)
      .slice(0, 5)
      .map((i) => ({ name: i.ingredient!.name_en, reason: i.ingredient!.reason_en }));

    post<{ text: string }>(
      "/api/explain",
      {
        lang,
        verdict: verdict.level,
        productName: scan.product_name,
        score: scan.score,
        grade: scan.grade,
        flagged: flagged.length ? flagged : concerns,
        loads: loadsFor(scan.nutrition, profile),
        person: slimProfile(profile),
        hardBlocks: verdict.hardBlocks.map((a) => ALLERGEN_META[a].label_en),
      },
      controller.signal
    ).then((data) => {
      if (!alive) return;
      if (data?.text) {
        setText(data.text);
        setIsAi(true);
        setState("done");
        writeCache(key, data.text);
      } else {
        // Silent: the deterministic text is already correct and on screen.
        setState("unavailable");
      }
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [scan, items, profile, lang, enabled]);

  return { text, state, isAi };
}

/** Nutrient loads against this person's own caps, shaped for the prompt. */
function loadsFor(nutrition: Nutrition, profile: UserProfile | null) {
  if (!nutrition) return [];
  return nutrientLoads(nutrition, profile).map((l) => ({
    label: l.label_en,
    pct: l.pct,
    amount: `${l.amount.toFixed(l.unit === "mg" ? 0 : 1)}${l.unit}`,
  }));
}

/* ──────────────────── Hook: live alternatives ──────────────────── */

export interface AiAlternative {
  name: string;
  brand: string;
  why_en: string;
  why_hi: string;
  benefits_en: string[];
  benefits_hi: string[];
  availability: "widely_sold" | "online" | "niche";
  approx_price_inr: string;
}

export interface AiSource {
  title: string;
  uri: string;
}

export function useAiAlternatives(
  scan: ScanResult | undefined,
  items: ResolvedIngredient[],
  profile: UserProfile | null,
  lang: "en" | "hi",
  enabled: boolean
): { items: AiAlternative[]; sources: AiSource[]; state: AiState; retry: () => void } {
  const [alts, setAlts] = useState<AiAlternative[]>([]);
  const [sources, setSources] = useState<AiSource[]>([]);
  const [state, setState] = useState<AiState>("idle");
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!scan || !enabled) {
      setState(enabled ? "idle" : "unavailable");
      return;
    }

    const key = `alts.${scan.scan_id}.${profile?.profile_id ?? "default"}.${lang}`;
    if (nonce === 0) {
      const cached = readCache<{ items: AiAlternative[]; sources: AiSource[] }>(key);
      if (cached) {
        setAlts(cached.items);
        setSources(cached.sources ?? []);
        setState("done");
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let alive = true;
    setState("loading");

    const problems = [
      ...items
        .filter((i) => i.verdict === "avoid" && i.ingredient)
        .slice(0, 4)
        .map((i) => `Contains ${i.ingredient!.name_en} — ${i.ingredient!.reason_en}`),
      ...(lang === "en" ? scan.breakdown.notes_en : scan.breakdown.notes_en).slice(0, 3),
    ].slice(0, 6);

    post<{ items: AiAlternative[]; sources: AiSource[] }>(
      "/api/alternatives",
      {
        lang,
        category: scan.product_category,
        productName: scan.product_name,
        score: scan.score,
        problems,
        person: profile
          ? {
              conditions: profile.conditions.map((c) => CONDITION_META[c].label_en),
              allergies: profile.allergies.map((a) => ALLERGEN_META[a].label_en),
              diet: profile.diet_preference,
            }
          : null,
      },
      controller.signal
    ).then((data) => {
      if (!alive) return;
      if (data?.items) {
        setAlts(data.items);
        setSources(data.sources ?? []);
        setState("done");
        writeCache(key, { items: data.items, sources: data.sources ?? [] }, 12 * 60 * 60 * 1000);
      } else {
        setState("unavailable");
      }
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [scan, items, profile, lang, enabled, nonce]);

  return { items: alts, sources, state, retry };
}

/* ────────────────────────── Hook: ask ────────────────────────────── */

export function useAsk(
  scan: ScanResult | undefined,
  items: ResolvedIngredient[],
  profile: UserProfile | null,
  lang: "en" | "hi"
) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [state, setState] = useState<AiState>("idle");

  const ask = useCallback(
    async (question: string) => {
      if (!scan) return;
      setState("loading");
      setAnswer(null);

      const data = await post<{ text: string }>("/api/ask", {
        lang,
        question,
        productName: scan.product_name,
        score: scan.score,
        grade: scan.grade,
        ingredients: items
          .filter((i) => i.ingredient)
          .slice(0, 25)
          .map((i) => ({ name: i.ingredient!.name_en, verdict: i.verdict })),
        nutrition: scan.nutrition,
        person: slimProfile(profile),
      });

      if (data?.text) {
        setAnswer(data.text);
        setState("done");
      } else {
        setState("unavailable");
      }
    },
    [scan, items, profile, lang]
  );

  const reset = useCallback(() => {
    setAnswer(null);
    setState("idle");
  }, []);

  return { answer, state, ask, reset };
}

/* ─────────────────────── Hook: dynamic tip ─────────────────────── */

export function useAiTip(
  fallback: string,
  recent: { name: string; grade: string; category: string }[],
  profile: UserProfile | null,
  lang: "en" | "hi",
  enabled: boolean
): { text: string; isAi: boolean } {
  const [text, setText] = useState(fallback);
  const [isAi, setIsAi] = useState(false);

  useEffect(() => {
    setText(fallback);
    setIsAi(false);
  }, [fallback]);

  useEffect(() => {
    if (!enabled) return;

    const daySeed = new Date().toISOString().slice(0, 10);
    const key = `tip.${daySeed}.${lang}.${profile?.profile_id ?? "none"}`;
    const cached = readCache<string>(key);
    if (cached) {
      setText(cached);
      setIsAi(true);
      return;
    }

    const controller = new AbortController();
    let alive = true;

    post<{ text: string }>(
      "/api/tip",
      {
        lang,
        daySeed,
        recent: recent.slice(0, 5),
        person: profile
          ? {
              conditions: profile.conditions.map((c) => CONDITION_META[c].label_en),
              allergies: profile.allergies.map((a) => ALLERGEN_META[a].label_en),
            }
          : null,
      },
      controller.signal
    ).then((data) => {
      if (!alive || !data?.text) return;
      setText(data.text);
      setIsAi(true);
      writeCache(key, data.text, 24 * 60 * 60 * 1000);
    });

    return () => {
      alive = false;
      controller.abort();
    };
    // Only the day, language and profile should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, profile?.profile_id, enabled]);

  return { text, isAi };
}

/* ───────────────── Unknown-ingredient enrichment ───────────────── */

export interface AiIngredient {
  raw_text: string;
  name_en: string;
  name_hi: string;
  scientific?: string;
  code?: string;
  what_en: string;
  what_hi: string;
  verdict: "good" | "average" | "avoid" | "unknown";
  reason_en: string;
  reason_hi: string;
  allergens?: string[];
  penalty?: number;
  confidence: number;
}

/**
 * Resolves the tokens the bundled DB could not match. Batched into one
 * request per scan (spec §11.4) and cached by the exact token set, so the
 * same unusual ingredient is only ever paid for once.
 */
export function useAiIngredients(
  unknowns: string[],
  enabled: boolean
): { resolved: Map<string, AiIngredient>; state: AiState } {
  const [resolved, setResolved] = useState<Map<string, AiIngredient>>(new Map());
  const [state, setState] = useState<AiState>("idle");

  const signature = unknowns.slice().sort().join("|");

  useEffect(() => {
    if (!enabled || !signature) {
      setState(enabled ? "idle" : "unavailable");
      return;
    }

    const key = `ing.${signature}`;
    const cached = readCache<AiIngredient[]>(key);
    if (cached) {
      setResolved(new Map(cached.map((i) => [i.raw_text.toLowerCase(), i])));
      setState("done");
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setState("loading");

    post<{ items: AiIngredient[] }>(
      "/api/ingredients",
      { tokens: signature.split("|") },
      controller.signal
    ).then((data) => {
      if (!alive) return;
      if (data?.items?.length) {
        setResolved(new Map(data.items.map((i) => [i.raw_text.toLowerCase(), i])));
        setState("done");
        writeCache(key, data.items, 30 * 24 * 60 * 60 * 1000);
      } else {
        setState("unavailable");
      }
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [signature, enabled]);

  return { resolved, state };
}
