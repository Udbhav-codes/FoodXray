import "server-only";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { checkRate } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════
   RATE LIMITING

   Without this, a public endpoint backed by our own Gemini key is a
   stranger's free API. Spec §11.4 suggests capping AI-assisted scans on
   the free tier; these are the per-IP, per-route caps that enforce it.

   The raw IP is never stored. It is salted and hashed, and only the hash
   reaches the database — enough to count requests, useless for tracking
   anyone.
   ═══════════════════════════════════════════════════════════════════ */

export const LIMITS = {
  /** Cheap and cached hard. */
  explain: { limit: 60, windowMs: 60 * 60 * 1000 },
  tip: { limit: 30, windowMs: 60 * 60 * 1000 },
  /** Search-grounded, so the most expensive call we make. */
  alternatives: { limit: 25, windowMs: 60 * 60 * 1000 },
  /** Uncached free text — the easiest one to abuse. */
  ask: { limit: 20, windowMs: 60 * 60 * 1000 },
  ingredients: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const;

export type RouteName = keyof typeof LIMITS;

/**
 * Vercel puts the real client IP in x-forwarded-for; the first entry is the
 * client, the rest are proxies. Falls back to a shared bucket rather than
 * letting an unidentifiable caller bypass limiting entirely.
 */
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function bucketFor(req: Request, route: RouteName, windowMs: number): string {
  const ip = clientIp(req);
  const window = Math.floor(Date.now() / windowMs);
  // Salted so the hashes are not reversible via a rainbow table of IPs.
  const salt = process.env.RATE_LIMIT_SALT ?? "foodxray";
  return createHash("sha256")
    .update(`${salt}:${ip}:${route}:${window}`)
    .digest("hex")
    .slice(0, 48);
}

/**
 * Returns a 429 response when the caller is over the limit, or null to
 * proceed. Fails open if the database is unreachable (see checkRate).
 */
export async function enforceRate(
  req: Request,
  route: RouteName
): Promise<NextResponse | null> {
  const { limit, windowMs } = LIMITS[route];
  const verdict = await checkRate(bucketFor(req, route, windowMs), limit, windowMs);

  if (verdict.allowed) return null;

  return NextResponse.json(
    {
      error: "rate_limited",
      detail: `Too many ${route} requests. Try again later.`,
      limit: verdict.limit,
      resetIn: verdict.resetIn,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(verdict.resetIn),
        "X-RateLimit-Limit": String(verdict.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
