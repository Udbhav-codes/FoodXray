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
   PERSONAL EXPLANATION — spec §11.3, Prompt B.

   The rules engine has already decided the verdict and the score. This
   route only turns that decision into warm, plain language for one
   specific person. The verdict is passed in and the model is told, in
   the system instruction, that it may not change it.
   ═══════════════════════════════════════════════════════════════════ */

interface Body {
  lang: "en" | "hi";
  /** Already decided by the rules engine — the model explains, not decides. */
  verdict: string;
  productName: string;
  score: number;
  grade: string;
  /** Ingredients the rules engine flagged, with why. */
  flagged: { name: string; reason: string }[];
  /** Nutrient loads as a share of THIS person's caps. */
  loads: { label: string; pct: number; amount: string }[];
  /** De-identified: no name, no exact weight. */
  person: {
    ageBand?: string;
    conditions: string[];
    allergies: string[];
    goal?: string;
  } | null;
  hardBlocks: string[];
}

const SYSTEM = `
You write short health notes for PoshanLens, an Indian packaged-food label app.

${SAFETY_RULES}

${HINDI_STYLE}

Style:
- Exactly 2 to 3 sentences. Never more.
- Lead with the single most important fact for THIS person.
- Use concrete numbers from the data you are given. Never invent a number.
- If there are better options, you may end by pointing down to them. Do not name specific brands.
- Output ONLY the explanation text. No JSON, no preamble, no bullet points, no markdown.
`.trim();

export async function POST(req: Request) {
  const limited = await enforceRate(req, "explain");
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

  const person = body.person;
  const personLine = person
    ? [
        person.ageBand ? `Age ${person.ageBand}` : null,
        person.conditions.length
          ? `Health conditions: ${person.conditions.join(", ")}`
          : "No health conditions declared",
        person.allergies.length ? `Allergies: ${person.allergies.join(", ")}` : null,
        person.goal ? `Goal: ${person.goal}` : null,
      ]
        .filter(Boolean)
        .join(". ")
    : "No profile saved. Treat as a general assessment for an average healthy adult, and say plainly that it is general.";

  const prompt = `
Language: ${body.lang === "hi" ? "Hindi" : "English"}
Verdict (ALREADY DECIDED — explain this, do not change it): ${body.verdict}

Person: ${personLine}

Product: ${body.productName}. Health score ${body.score}/100, grade ${body.grade}.

${
  body.hardBlocks.length
    ? `ALLERGY BLOCK — this product contains: ${body.hardBlocks.join(", ")}. This person has declared that allergy. Lead with this. Be direct and unambiguous that they should not eat it.`
    : ""
}

Flagged for this person:
${
  body.flagged.length
    ? body.flagged.map((f) => `- ${f.name}: ${f.reason}`).join("\n")
    : "- Nothing specific was flagged by the rules."
}

Nutrient load for one serving, against this person's own daily limits:
${
  body.loads.length
    ? body.loads.map((l) => `- ${l.label}: ${l.amount} (${l.pct}% of their daily limit)`).join("\n")
    : "- Not available."
}

Write the explanation.
`.trim();

  // Same product + same person + same language = same answer, so it is only
  // ever generated once (spec §11.4).
  const key = cacheKey(
    "explain",
    body.lang,
    body.verdict,
    body.productName,
    body.score,
    body.flagged.map((f) => f.name).join(","),
    person?.conditions.join(","),
    person?.allergies.join(","),
    person?.ageBand
  );

  try {
    const result = await callGemini(
      {
        system: SYSTEM,
        prompt,
        temperature: 0.5,
        maxOutputTokens: 1200,
        timeoutMs: 15_000,
      },
      { cacheAs: key, kind: "explain", cacheTtlMs: 7 * 24 * 60 * 60 * 1000 }
    );

    return NextResponse.json({ text: result.text, model: result.model });
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 502;
    // The caller keeps its deterministic text on any failure, so this is a
    // soft failure by design.
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: status >= 500 ? 502 : status }
    );
  }
}
