import { NextResponse } from "next/server";
import {
  aiConfigured,
  callGemini,
  GeminiError,
  HINDI_STYLE,
  SAFETY_RULES,
} from "@/lib/gemini";

export const runtime = "nodejs";

/* ═══════════════════════════════════════════════════════════════════
   FREE-TEXT Q&A — spec §11.1, "can I eat this with thyroid?"

   Permitted by the spec *with a mandatory disclaimer*, which the UI
   renders alongside every answer. The model answers questions about the
   scanned label in front of the person; it is instructed to refuse
   anything that is really a medical question in disguise.
   ═══════════════════════════════════════════════════════════════════ */

interface Body {
  lang: "en" | "hi";
  question: string;
  productName: string;
  score: number;
  grade: string;
  ingredients: { name: string; verdict: string }[];
  nutrition: Record<string, number | undefined>;
  person: {
    ageBand?: string;
    conditions: string[];
    allergies: string[];
  } | null;
}

const SYSTEM = `
You answer questions about a specific packaged food label inside PoshanLens,
an Indian food-label app. The person is standing in a shop looking at the pack.

${SAFETY_RULES}

${HINDI_STYLE}

Scope:
- Answer ONLY from the label data you are given, plus general food science.
- If the question needs information that is not on the label, say what is missing.
- If the question is really a medical one — dosage, symptoms, whether to take a
  medicine, whether a condition is getting worse — do not answer it. Say plainly
  that it is a question for their doctor, and answer whatever food part you can.
- Never tell someone to start, stop, or change a treatment.

Style:
- 2 to 4 sentences. Short and direct.
- Use numbers from the label where they help. Never invent a number.
- Output plain text only. No markdown, no bullets, no headings.
`.trim();

const MAX_QUESTION = 300;

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

  const question = String(body.question ?? "").trim().slice(0, MAX_QUESTION);
  if (question.length < 3) {
    return NextResponse.json({ error: "empty_question" }, { status: 400 });
  }

  const nutritionLines = Object.entries(body.nutrition ?? {})
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

  const prompt = `
Language: ${body.lang === "hi" ? "Hindi" : "English"}

The person asks: "${question}"

They are looking at: ${body.productName} — score ${body.score}/100, grade ${body.grade}.

Ingredients on the label:
${body.ingredients.map((i) => `- ${i.name} (${i.verdict})`).join("\n") || "- Not available."}

Nutrition per 100g/ml:
${nutritionLines || "- Not printed on the scanned portion of the label."}

About them: ${
    body.person
      ? [
          body.person.ageBand ? `age ${body.person.ageBand}` : null,
          body.person.conditions.length
            ? `conditions: ${body.person.conditions.join(", ")}`
            : "no conditions declared",
          body.person.allergies.length
            ? `allergies: ${body.person.allergies.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("; ")
      : "no profile saved — answer generally and say so"
  }

Answer their question.
`.trim();

  try {
    // Not cached: a free-text question is rarely repeated verbatim, and
    // caching answers keyed on user prose has poor hit rates anyway.
    const result = await callGemini({
      system: SYSTEM,
      prompt,
      temperature: 0.45,
      maxOutputTokens: 1400,
      timeoutMs: 20_000,
    });

    return NextResponse.json({ text: result.text, model: result.model });
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 502;
    return NextResponse.json(
      { error: "ai_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: status >= 500 ? 502 : status }
    );
  }
}
