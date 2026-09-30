import { NextResponse } from "next/server";
import {
  aiConfigured,
  cacheKey,
  callGemini,
  GeminiError,
  HINDI_STYLE,
  SAFETY_RULES,
} from "@/lib/gemini";

import { enforceRate } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* ═══════════════════════════════════════════════════════════════════
   TIP OF THE DAY — replaces the fixed rotation in data/tips.ts.

   Personalised to what this household actually scans: a diabetic who
   keeps scanning biscuits gets tips about hidden sugars, not a generic
   fact about MSG. Falls back to the static rotation if AI is off.
   ═══════════════════════════════════════════════════════════════════ */

interface Body {
  lang: "en" | "hi";
  /** Recent scan categories and grades — what this person actually buys. */
  recent: { name: string; grade: string; category: string }[];
  person: { conditions: string[]; allergies: string[] } | null;
  /** Stable per day, so the tip does not churn on every render. */
  daySeed: string;
}

const SYSTEM = `
You write the "Did you know?" card in FoodXray, an Indian food-label app.

${SAFETY_RULES}

${HINDI_STYLE}

Write ONE tip that teaches the reader to decode labels better.

Rules:
- 1 to 2 sentences. Under 30 words.
- Teach something concrete and checkable — an ingredient alias, a label trick, a threshold. Not vague advice like "eat healthy".
- Ground it in Indian packaged food: maida, vanaspati, palmolein, INS codes, "no added sugar" claims.
- Never shame. Never alarm. This is a friendly fact, not a warning.
- Output ONLY the tip text. No "Did you know?" prefix, no quotes, no markdown.
`.trim();

export async function POST(req: Request) {
  const limited = await enforceRate(req, "tip");
  if (limited) return limited;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const context = body.recent?.length
    ? `They recently scanned: ${body.recent
        .slice(0, 5)
        .map((r) => `${r.name} (grade ${r.grade})`)
        .join(", ")}. Make the tip relevant to that kind of food.`
    : "They have not scanned anything yet. Pick a broadly useful label-reading tip.";

  const conditions = body.person?.conditions.length
    ? `They have: ${body.person.conditions.join(", ")}. Lean the tip toward what matters for that, without giving medical advice.`
    : "";

  const prompt = `
Language: ${body.lang === "hi" ? "Hindi" : "English"}

${context}
${conditions}

Write today's tip.
`.trim();

  const key = cacheKey(
    "tip",
    body.lang,
    body.daySeed,
    body.person?.conditions.join(","),
    body.recent?.[0]?.category
  );

  try {
    const result = await callGemini(
      {
        system: SYSTEM,
        prompt,
        // Higher temperature: a tip that repeats daily is a boring tip.
        temperature: 0.9,
        maxOutputTokens: 800,
        timeoutMs: 12_000,
      },
      { cacheAs: key, kind: "tip", cacheTtlMs: 24 * 60 * 60 * 1000 }
    );

    return NextResponse.json({ text: result.text, model: result.model });
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 502;
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: status >= 500 ? 502 : status }
    );
  }
}
