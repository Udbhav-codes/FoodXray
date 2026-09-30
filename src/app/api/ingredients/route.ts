import { NextResponse } from "next/server";
import {
  aiConfigured,
  cacheKey,
  callGemini,
  GeminiError,
  HINDI_STYLE,
  parseJson,
  SAFETY_RULES,
} from "@/lib/gemini";

import { enforceRate } from "@/lib/ratelimit";

export const runtime = "nodejs";

/* ═══════════════════════════════════════════════════════════════════
   UNKNOWN INGREDIENT RESOLUTION — spec §11.2, Prompt A.

   The bundled database is always the first line and handles the common
   case offline. This route only ever sees the long tail: tokens the local
   DB could not match. Every unknown on a label is batched into ONE call
   (spec §11.4), and results are cached so an ingredient is paid for once.

   Honesty rule (spec §9): the model is explicitly instructed to return
   "unknown" with low confidence rather than invent a plausible answer,
   and anything below the confidence floor is dropped server-side.
   ═══════════════════════════════════════════════════════════════════ */

const CONFIDENCE_FLOOR = 0.5;

const SYSTEM = `
You are a food-science reference for an Indian packaged-food app.

${SAFETY_RULES}

${HINDI_STYLE}

Accuracy matters far more than completeness. If you are not confident about an
ingredient, set "verdict" to "unknown" and "confidence" below 0.5. Never invent
a plausible-sounding answer — a confidently wrong answer destroys trust
permanently, and a blank is always better.

Verdict meanings:
- "good": safe, or actively beneficial. Whole foods, vitamins, natural fibres.
- "average": safe in moderation, but with a caveat worth knowing.
- "avoid": real evidence of harm, or a heavily processed ingredient with no benefit.
- "unknown": you are not confident. Use this freely.
`.trim();

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      raw_text: { type: "STRING" },
      name_en: { type: "STRING" },
      name_hi: { type: "STRING" },
      scientific: { type: "STRING" },
      code: { type: "STRING" },
      category: { type: "STRING" },
      what_en: { type: "STRING", description: "Max 20 words, plain English" },
      what_hi: { type: "STRING", description: "Same, natural Hindi" },
      verdict: { type: "STRING", enum: ["good", "average", "avoid", "unknown"] },
      reason_en: { type: "STRING", description: "Max 15 words" },
      reason_hi: { type: "STRING" },
      allergens: { type: "ARRAY", items: { type: "STRING" } },
      penalty: { type: "NUMBER", description: "0 harmless to 10 worst" },
      confidence: { type: "NUMBER" },
    },
    required: [
      "raw_text", "name_en", "name_hi", "what_en", "what_hi",
      "verdict", "reason_en", "reason_hi", "confidence",
    ],
  },
} as const;

interface Resolved {
  raw_text: string;
  name_en: string;
  name_hi: string;
  scientific?: string;
  code?: string;
  category?: string;
  what_en: string;
  what_hi: string;
  verdict: "good" | "average" | "avoid" | "unknown";
  reason_en: string;
  reason_hi: string;
  allergens?: string[];
  penalty?: number;
  confidence: number;
}

const VALID_ALLERGENS = new Set([
  "peanut", "treenut", "milk", "egg", "soy", "gluten", "fish", "shellfish", "sesame",
]);

export async function POST(req: Request) {
  const limited = await enforceRate(req, "ingredients");
  if (limited) return limited;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  let tokens: string[];
  try {
    const body = await req.json();
    tokens = Array.isArray(body?.tokens) ? body.tokens : [];
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Keep the batch sane: a label with 40 unknowns is an OCR failure, not a
  // lookup problem, and we should not pay to hallucinate over noise.
  const clean = [...new Set(tokens.map((t) => String(t).trim()).filter((t) => t.length >= 2))].slice(0, 20);

  if (!clean.length) return NextResponse.json({ items: [] });

  const prompt = `
Identify these ingredients from an Indian packaged food label. They were not
found in our local database, so they are unusual, regional, or oddly spelled
(possibly misread by OCR).

Ingredients: ${JSON.stringify(clean)}

Return one object per ingredient, keeping "raw_text" EXACTLY as given so we can
match them back. Set "code" to the INS/E number if the ingredient has one, else
an empty string. "allergens" must only contain values from this list:
peanut, treenut, milk, egg, soy, gluten, fish, shellfish, sesame.
"penalty" is 0 for a harmless whole food, 6-7 for something worth avoiding, 10
for trans fat.
`.trim();

  const key = cacheKey("ingredients", clean.sort().join(","));

  try {
    const result = await callGemini(
      {
        system: SYSTEM,
        prompt,
        schema: SCHEMA as unknown as Record<string, unknown>,
        // Low temperature: this is a reference lookup, not creative writing.
        temperature: 0.1,
        maxOutputTokens: 8192,
        timeoutMs: 25_000,
      },
      { cacheAs: key, kind: "ingredients", cacheTtlMs: 30 * 24 * 60 * 60 * 1000 }
    );

    const parsed = parseJson<Resolved[]>(result.text);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: "ai_bad_shape" }, { status: 502 });
    }

    // Validate and drop malformed entries rather than crashing (spec §11.2).
    const items = parsed
      .filter(
        (r) =>
          r &&
          typeof r.raw_text === "string" &&
          typeof r.name_en === "string" &&
          typeof r.confidence === "number"
      )
      .map((r) => ({
        ...r,
        // Below the floor we surface it as an honest unknown rather than a guess.
        verdict:
          r.confidence < CONFIDENCE_FLOOR ? ("unknown" as const) : r.verdict,
        penalty: clampPenalty(r.penalty, r.verdict),
        allergens: (r.allergens ?? []).filter((a) =>
          VALID_ALLERGENS.has(String(a).toLowerCase())
        ),
      }));

    return NextResponse.json({ items, model: result.model });
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 502;
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: status >= 500 ? 502 : status }
    );
  }
}

/** Never let the model's own number drive the score beyond sane bounds. */
function clampPenalty(value: unknown, verdict: string): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : NaN;
  if (Number.isNaN(n)) {
    return verdict === "avoid" ? 6 : verdict === "average" ? 2 : 0;
  }
  return Math.max(0, Math.min(10, Math.round(n)));
}
