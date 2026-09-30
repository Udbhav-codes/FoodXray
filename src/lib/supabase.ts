import "server-only";

/* ═══════════════════════════════════════════════════════════════════
   SUPABASE — server-side only.

   Why this exists at all: on Vercel, every API route is a serverless
   function whose process may be torn down between requests. The
   in-memory cache in gemini.ts therefore survives only as long as one
   warm instance, which means without a shared store we would re-pay
   Gemini for the same ingredient over and over, and rate limiting would
   be unenforceable across instances.

   Two tables, neither holding personal data:
     ai_cache     - Gemini responses keyed by request hash. An ingredient
                    resolved for one user is free for everyone after that
                    (spec §11.4).
     rate_limits  - per-IP counters. The raw IP is never stored, only a
                    SHA-256 of (ip + route + window).

   Health data never touches this database. Profiles, scans and food logs
   stay in the browser (spec §18.1).
   ═══════════════════════════════════════════════════════════════════ */

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * The service-role key bypasses RLS, which is exactly why both tables have
 * RLS on with zero policies: nothing else can touch them. This must never
 * be exposed to the browser — `server-only` above makes a client import a
 * build error rather than a silent leak.
 */
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

export function dbConfigured(): boolean {
  return Boolean(URL && SERVICE_KEY);
}

function headers(extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Every call is wrapped so a database outage degrades, never 500s. */
async function safeFetch(
  path: string,
  init: RequestInit,
  timeoutMs = 4000
): Promise<Response | null> {
  if (!dbConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${URL}/rest/v1/${path}`, {
      ...init,
      headers: headers(init.headers as Record<string, string>),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    // Network failure or timeout. The caller treats this as a cache miss,
    // which costs a Gemini call but never breaks the request.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────── Shared AI cache ────────────────────────── */

export interface CachedPayload {
  text: string;
  sources?: { title: string; uri: string }[];
  model?: string;
}

export async function cacheLookup(key: string): Promise<CachedPayload | null> {
  const res = await safeFetch(
    `ai_cache?cache_key=eq.${encodeURIComponent(key)}&expires_at=gt.${new Date().toISOString()}&select=payload,model&limit=1`,
    { method: "GET" }
  );
  if (!res?.ok) return null;

  try {
    const rows = (await res.json()) as { payload: CachedPayload; model?: string }[];
    const row = rows?.[0];
    if (!row?.payload) return null;

    // Fire-and-forget hit counter: useful for seeing what the cache is
    // actually saving, and never worth delaying a response for.
    void safeFetch(`rpc/touch_cache`, {
      method: "POST",
      body: JSON.stringify({ p_key: key }),
    }).catch(() => null);

    return { ...row.payload, model: row.model ?? row.payload.model };
  } catch {
    return null;
  }
}

export async function cacheStore(
  key: string,
  kind: string,
  payload: CachedPayload,
  ttlMs: number
): Promise<void> {
  const expires = new Date(Date.now() + ttlMs).toISOString();

  // merge-duplicates makes this an upsert on the cache_key primary key.
  await safeFetch("ai_cache?on_conflict=cache_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      cache_key: key,
      kind,
      payload,
      model: payload.model ?? null,
      expires_at: expires,
    }),
  });
}

/* ─────────────────────────── Rate limiting ─────────────────────────── */

export interface RateVerdict {
  allowed: boolean;
  count: number;
  limit: number;
  /** Seconds until the window resets, for the Retry-After header. */
  resetIn: number;
}

/**
 * Fixed-window limiter. `bucket` must already be hashed by the caller so no
 * raw IP reaches the database.
 *
 * Fails OPEN: if the database is unreachable we allow the request rather
 * than taking the whole app down. That is the right trade-off for a
 * nutrition app — the downside is cost, not a security breach.
 */
export async function checkRate(
  bucket: string,
  limit: number,
  windowMs: number
): Promise<RateVerdict> {
  const expires = new Date(Date.now() + windowMs).toISOString();

  const res = await safeFetch("rpc/bump_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_bucket: bucket, p_expires: expires }),
  });

  if (!res?.ok) {
    return { allowed: true, count: 0, limit, resetIn: 0 };
  }

  try {
    const count = (await res.json()) as number;
    return {
      allowed: count <= limit,
      count,
      limit,
      resetIn: Math.ceil(windowMs / 1000),
    };
  } catch {
    return { allowed: true, count: 0, limit, resetIn: 0 };
  }
}
