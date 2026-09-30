import "server-only";
import { after } from "next/server";
import { cacheLookup, cacheStore } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════
   GEMINI CLIENT — server-side only.

   The API key lives here and never reaches the browser (spec §17). Every
   AI call in the app routes through a Next.js API route that imports this
   module; `server-only` makes a client import a build error rather than a
   silent key leak.

   Safety boundary (spec §10.1 / §18.3): this module generates *language*.
   It never decides a verdict, a score, or whether a food is safe for a
   medical condition. Those stay with the deterministic rules in
   `score.ts` and `personalise.ts`.
   ═══════════════════════════════════════════════════════════════════ */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Tried in order; a failure on one falls through to the next.
 *
 * `gemini-flash-latest` is an alias that tracks the current Flash model, so
 * this chain does not go stale the way a pinned version does — older pinned
 * models get closed to new API keys and start returning 404. The alias is
 * also the one most likely to be under load, hence the pinned fallbacks
 * behind it: Flash Lite reliably answers when Flash is returning 503.
 */
const MODEL_CHAIN = (
  process.env.GEMINI_MODEL ??
  "gemini-flash-latest,gemini-3.6-flash,gemini-flash-lite-latest"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GeminiCall {
  system?: string;
  prompt: string;
  /** Ask for JSON back. Ignored when `search` is on — they conflict. */
  schema?: Record<string, unknown>;
  /** Ground the answer in Google Search results. */
  search?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** Abort if the model takes longer than this. */
  timeoutMs?: number;
}

export interface GeminiResult {
  text: string;
  /** Source URLs, when the answer was search-grounded. */
  sources: { title: string; uri: string }[];
  model: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/* ─────────────────────────── Response cache ───────────────────────────
   Spec §11.4: never pay to resolve "Palm Oil" twice. This is a process-
   local cache — it survives across requests on one server instance, which
   is all a single-node deployment needs. A multi-node deployment would
   swap this for Redis without touching call sites.
   ─────────────────────────────────────────────────────────────────── */

interface CacheEntry {
  value: GeminiResult;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MAX = 500;

function cacheGet(key: string): GeminiResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  // Refresh recency so the eviction below stays roughly LRU.
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key: string, value: GeminiResult, ttlMs: number) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p !== undefined).join("|");
}

/* ───────────────────────────── The call ───────────────────────────── */

export async function callGemini(
  call: GeminiCall,
  opts: { cacheAs?: string; cacheTtlMs?: number; kind?: string } = {}
): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set", 500, false);

  // Two-tier cache. L1 is this process's memory, which on Vercel lives only
  // as long as one warm lambda. L2 is Supabase, shared across every instance
  // AND every user — so an ingredient resolved once is free globally
  // thereafter (spec §11.4). Without L2 the cache would barely function.
  if (opts.cacheAs) {
    const warm = cacheGet(opts.cacheAs);
    if (warm) return warm;

    const shared = await cacheLookup(opts.cacheAs);
    if (shared?.text) {
      const result: GeminiResult = {
        text: shared.text,
        sources: shared.sources ?? [],
        model: shared.model ?? "cache",
      };
      // Promote into L1 so repeat hits on this instance skip the round trip.
      cacheSet(opts.cacheAs, result, opts.cacheTtlMs ?? 24 * 60 * 60 * 1000);
      return result;
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: call.prompt }] }],
    generationConfig: {
      temperature: call.temperature ?? 0.4,
      maxOutputTokens: call.maxOutputTokens ?? 1024,
      // Structured output and search grounding are mutually exclusive in the
      // API, so JSON mode is only requested when we are not grounding.
      ...(call.schema && !call.search
        ? { responseMimeType: "application/json", responseSchema: call.schema }
        : {}),
    },
  };

  if (call.system) {
    body.systemInstruction = { parts: [{ text: call.system }] };
  }
  if (call.search) {
    body.tools = [{ google_search: {} }];
  }

  // Every model's failure is kept, not just the last one. Reporting only the
  // final model's error hides the real cause when the chain falls through.
  const failures: string[] = [];
  let lastError: GeminiError | null = null;

  for (const model of MODEL_CHAIN) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? 20_000);

    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        // An unknown/unsupported model is worth retrying on the next one;
        // auth and quota errors are not.
        if (res.status === 404 || res.status === 400) {
          lastError = new GeminiError(
            `${model}: ${res.status} ${detail.slice(0, 160)}`,
            res.status,
            true
          );
          failures.push(lastError.message);
          continue;
        }
        throw new GeminiError(
          `Gemini ${res.status}: ${detail.slice(0, 200)}`,
          res.status,
          res.status === 429 || res.status >= 500
        );
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];

      const text: string =
        candidate?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim() ?? "";

      if (!text) {
        const reason =
          candidate?.finishReason ?? data?.promptFeedback?.blockReason ?? "empty";
        throw new GeminiError(`${model} returned no text (${reason})`, 502, true);
      }

      // Thinking models spend output tokens on internal reasoning before they
      // write anything, so a tight cap yields prose that stops mid-sentence
      // or JSON that will not parse. A truncated answer is worse than our
      // deterministic fallback, so treat it as a failure and try the next model.
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new GeminiError(
          `${model} hit the output limit before finishing`,
          502,
          true
        );
      }

      const sources = extractSources(candidate);
      const result: GeminiResult = { text, sources, model };

      if (opts.cacheAs) {
        const ttl = opts.cacheTtlMs ?? 24 * 60 * 60 * 1000;
        cacheSet(opts.cacheAs, result, ttl);

        // Write-through to the shared cache WITHOUT making the user wait.
        //
        // This must go through `after()`, not a bare floating promise: on
        // serverless the function is frozen the moment the response is sent,
        // so `void cacheStore(...)` silently never completed and the shared
        // cache stayed permanently empty. `after()` is the supported way to
        // keep the invocation alive until the write lands.
        const write = () =>
          cacheStore(
            opts.cacheAs!,
            opts.kind ?? "generic",
            { text: result.text, sources: result.sources, model: result.model },
            ttl
          ).catch(() => undefined);

        try {
          after(write);
        } catch {
          // Outside a request context (a script, a test) there is nothing to
          // defer to, so just run it.
          await write();
        }
      }
      return result;
    } catch (err) {
      if (err instanceof GeminiError && !err.retryable) throw err;
      lastError =
        err instanceof GeminiError
          ? err
          : new GeminiError(
              err instanceof Error && err.name === "AbortError"
                ? `${model} timed out`
                : String(err),
              504,
              true
            );
      failures.push(lastError.message);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new GeminiError(
    `All models failed — ${failures.join(" | ")}`,
    lastError?.status ?? 502,
    true
  );
}

function extractSources(candidate: unknown): { title: string; uri: string }[] {
  const chunks =
    (candidate as { groundingMetadata?: { groundingChunks?: unknown[] } })
      ?.groundingMetadata?.groundingChunks ?? [];

  const out: { title: string; uri: string }[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { title?: string; uri?: string } })?.web;
    if (web?.uri && !out.some((s) => s.uri === web.uri)) {
      out.push({ title: web.title ?? web.uri, uri: web.uri });
    }
  }
  return out.slice(0, 6);
}

/**
 * Pulls a JSON value out of a model response. Search-grounded calls cannot
 * use JSON mode, so the text often arrives wrapped in prose or code fences.
 */
export function parseJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the outermost array or object in the string.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

/* ─────────────────────────── Shared guardrails ─────────────────────── */

/** Prepended to every prompt that touches health. Spec §18.3. */
export const SAFETY_RULES = `
Hard rules you must never break:
- You explain a verdict that has ALREADY been decided by a rules engine. You never change it, soften it, or argue with it.
- Never diagnose. Never prescribe. Never contradict a doctor.
- No alarmism. Be honest but calm. Never shame anyone for a food choice.
- If you are not confident about a fact, say so plainly instead of inventing one.
- Write at an 8th-grade reading level. Speak directly to the person as "you".
`.trim();

/** Natural-Hindi instruction, reused across prompts. Spec §16.3. */
export const HINDI_STYLE = `
When the language is Hindi, translate the MEANING, not the words. Write the
natural Hindi an Indian person actually speaks: "आपके लिए ठीक नहीं है", never
stiff bureaucratic Hindi like "अनुशंसित नहीं". Keep familiar English terms in
Devanagari transliteration where that is what people really say (प्रोटीन,
कैलोरी, शुगर). Use Latin numerals.
`.trim();
