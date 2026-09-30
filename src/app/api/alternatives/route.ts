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

export const runtime = "nodejs";

/* ═══════════════════════════════════════════════════════════════════
   LIVE ALTERNATIVES — spec §12, upgraded from the static seed catalogue.

   Google Search grounding lets us name products that are actually on sale
   in India right now, instead of the representative placeholders in
   data/products.ts.

   The honesty line (spec §12.4) matters more here than anywhere else in
   the app. Search can tell us a product EXISTS and is sold in India. It
   cannot tell us it is on the shelf of a specific shop this afternoon.
   So every result is labelled by how well we actually know it:

     "widely_sold"  - a mainstream product, easy to find
     "online"       - reliably available from online grocers
     "niche"        - real, but you may have to look

   We never emit "in stock". Without a retailer API that claim would be a
   lie, and the whole product rests on not lying.
   ═══════════════════════════════════════════════════════════════════ */

interface Body {
  lang: "en" | "hi";
  category: string;
  productName: string;
  score: number;
  /** What the rules engine disliked — steers the search toward real fixes. */
  problems: string[];
  person: {
    conditions: string[];
    allergies: string[];
    diet?: string;
  } | null;
  /** Optional, coarse. Only present if the user opted in to location. */
  city?: string;
}

const SYSTEM = `
You help Indian shoppers find genuinely healthier packaged-food alternatives.

${SAFETY_RULES}

${HINDI_STYLE}

Rules that matter more than being helpful:
- Only name products you have actually found evidence for in the search results. Never invent a brand, a product line, or a nutrition figure.
- Prefer widely available Indian brands over imported or boutique ones.
- NEVER claim a product is "in stock" anywhere. You do not know that. Describe how easy it is to find, nothing more.
- If you genuinely cannot find a better option, return an empty array. An empty list is a valid, honest answer.
- Every alternative must actually fix the stated problem. Do not suggest a product with the same flaw.
- No sponsored placement. No brand may be favoured for any reason other than being a better product.
`.trim();

export async function POST(req: Request) {
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
  const constraints: string[] = [];
  if (person?.allergies.length) {
    constraints.push(
      `MUST NOT contain (declared allergy): ${person.allergies.join(", ")}. This is a hard requirement — a product containing any of these is unsafe and must be excluded.`
    );
  }
  if (person?.conditions.includes("celiac")) {
    constraints.push("MUST be gluten-free (celiac disease).");
  }
  if (person?.diet) {
    constraints.push(`MUST suit a ${person.diet.replace(/_/g, " ")} diet.`);
  }
  if (person?.conditions.length) {
    constraints.push(
      `Should be suitable for someone with: ${person.conditions.join(", ")}.`
    );
  }

  const prompt = `
Search for healthier packaged alternatives currently sold in India.

The shopper just scanned: "${body.productName}" (category: ${body.category}),
which scored ${body.score}/100.

What is wrong with it:
${body.problems.length ? body.problems.map((p) => `- ${p}`).join("\n") : "- Heavily processed with little nutritional value."}

${constraints.length ? `Hard constraints:\n${constraints.map((c) => `- ${c}`).join("\n")}` : ""}
${body.city ? `The shopper is in ${body.city}. Prefer brands with good distribution there.` : ""}

Search for real products, then return ONLY a JSON array (no prose, no code
fences) of up to 4 objects with exactly these keys:

[{
  "name": "product name as printed on the pack",
  "brand": "brand name",
  "why_en": "one sentence, max 18 words, on why it is better THAN THE SCANNED PRODUCT",
  "why_hi": "the same in natural Hindi",
  "benefits_en": ["max 3 short chips, e.g. 'No palm oil'"],
  "benefits_hi": ["the same in Hindi"],
  "availability": "widely_sold" | "online" | "niche",
  "approx_price_inr": "e.g. '₹60 for 200g', or empty string if unknown"
}]

Return [] if you cannot find a genuinely better option. Do not pad the list.
`.trim();

  const key = cacheKey(
    "alts",
    body.lang,
    body.category,
    body.productName,
    body.score,
    person?.allergies.join(","),
    person?.conditions.join(","),
    person?.diet,
    body.city
  );

  try {
    const result = await callGemini(
      {
        system: SYSTEM,
        prompt,
        search: true,
        temperature: 0.3,
        maxOutputTokens: 4096,
        timeoutMs: 30_000,
      },
      // Shorter TTL than ingredient facts: the market actually moves.
      { cacheAs: key, cacheTtlMs: 12 * 60 * 60 * 1000 }
    );

    const parsed = parseJson<unknown[]>(result.text);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ items: [], sources: result.sources });
    }

    const items = parsed
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      .map((r) => ({
        name: String(r.name ?? "").slice(0, 80),
        brand: String(r.brand ?? "").slice(0, 60),
        why_en: String(r.why_en ?? "").slice(0, 200),
        why_hi: String(r.why_hi ?? "").slice(0, 240),
        benefits_en: toChips(r.benefits_en),
        benefits_hi: toChips(r.benefits_hi),
        availability: normaliseAvailability(r.availability),
        approx_price_inr: String(r.approx_price_inr ?? "").slice(0, 40),
      }))
      .filter((r) => r.name && r.brand)
      .slice(0, 4);

    return NextResponse.json({
      items,
      sources: result.sources,
      model: result.model,
    });
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 502;
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: status >= 500 ? 502 : status }
    );
  }
}

function toChips(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).slice(0, 40)).filter(Boolean).slice(0, 3);
}

/**
 * Anything the model invents outside our three honest levels — "in stock",
 * "available now" — collapses to the weakest claim we can defend.
 */
function normaliseAvailability(value: unknown): "widely_sold" | "online" | "niche" {
  const v = String(value ?? "").toLowerCase();
  if (v === "widely_sold" || v === "online" || v === "niche") return v;
  if (v.includes("wide") || v.includes("common")) return "widely_sold";
  if (v.includes("online")) return "online";
  return "niche";
}
