import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/gemini";
import { dbConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Lets the UI tell the difference between "AI is off" and "AI failed", so it
 * can show an honest state instead of a spinner that never resolves, and
 * gives us a one-call deployment health check.
 *
 * Deliberately exposes only booleans — never a key, a URL, or a model name.
 */
export async function GET() {
  return NextResponse.json({
    ai: aiConfigured(),
    // When false, the app still works: the shared cache degrades to
    // per-instance memory and rate limiting fails open.
    db: dbConfigured(),
  });
}
