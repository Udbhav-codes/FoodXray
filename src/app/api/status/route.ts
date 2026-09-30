import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

/**
 * Lets the UI tell the difference between "AI is off" and "AI failed", so it
 * can show an honest state instead of a spinner that never resolves.
 * Deliberately exposes only a boolean — never the key, never the model chain.
 */
export async function GET() {
  return NextResponse.json({ ai: aiConfigured() });
}
