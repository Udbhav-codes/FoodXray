import { ALIAS_INDEX, ALIASES_BY_LENGTH } from "@/data/ingredients";
import type { Ingredient, Nutrition, ResolvedIngredient } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   PARSE & NORMALISE — spec §8, step 3. Runs entirely on-device.
   ═══════════════════════════════════════════════════════════════════ */

/** Markers that begin the ingredient list, in both scripts. */
const START_MARKERS = [
  /ingredients?\s*[:\-—]/i,
  /ingredient\s+list\s*[:\-—]/i,
  /composition\s*[:\-—]/i,
  /सामग्री\s*[:\-—]/,
  /संघटक\s*[:\-—]/,
];

/** Markers that end it — everything after these is not an ingredient. */
const END_MARKERS = [
  /nutrition(al)?\s+(information|facts)/i,
  /nutritional\s+value/i,
  /allergen\s+(information|advice)/i,
  /best\s+before/i,
  /manufactured\s+(by|for)/i,
  /marketed\s+by/i,
  /net\s+(wt|weight|quantity)/i,
  /customer\s+care/i,
  /storage\s+instruction/i,
  /fssai/i,
  /lic\.?\s*no/i,
  /पोषण\s*(संबंधी)?\s*जानकारी/,
  /सर्वोत्तम/,
];

/** Phrases that are label boilerplate, not ingredients. */
const NOISE = [
  /^contains?\s+permitted\s+.*$/i,
  /^contains?\s+added\s+flavou?rs?$/i,
  /^contains?\s+class\s+[ivx]+\s+preservatives?$/i,
  /^and\s+added\s+flavou?rs?$/i,
  /^added\s+flavou?rs?$/i,
  /^natural\s+and\s+artificial\s+flavou?ring\s+substances?$/i,
  /^permitted\s+(synthetic\s+)?food\s+colou?rs?$/i,
  /^emulsifiers?$/i,
  /^stabilizers?$/i,
  /^stabilisers?$/i,
  /^preservatives?$/i,
  /^antioxidants?$/i,
  /^raising\s+agents?$/i,
  /^acidity\s+regulators?$/i,
  /^anti[\s-]?caking\s+agents?$/i,
  /^flavou?r\s+enhancers?$/i,
  /^humectants?$/i,
  /^firming\s+agents?$/i,
  /^thickeners?$/i,
  /^food\s+colou?rs?$/i,
  /^colou?rs?$/i,
  /^and$/i,
  /^or$/i,
  /^each$/i,
  /^may\s+contain.*$/i,
  /^\d+(\.\d+)?\s*%?$/,
  /^[^a-zऀ-ॿ]*$/i,
  // Roman-numeral sub-designations: "INS 500(ii)" leaves a bare "ii" behind
  // once the brackets are exploded.
  /^\(?[ivx]{1,4}\)?$/i,
  // A single stray letter is OCR noise, never an ingredient.
  /^[a-z]$/i,
];

/**
 * Repairs the mistakes OCR reliably makes on Indian labels: the digit/letter
 * confusions inside INS codes, and glyph noise around brackets.
 */
export function repairOcr(text: string): string {
  return (
    text
      // "1NS 330", "lNS 330", "INS330" → "INS 330"
      .replace(/\b[1lI!|]NS[\s.]*(\d{3,4}[a-z]{0,2})\b/gi, "INS $1")
      .replace(/\bINS[\s.]*(\d{3,4}[a-z]{0,2})\b/gi, "INS $1")
      .replace(/\bE[\s.]*(\d{3,4}[a-z]{0,2})\b/g, "E$1")
      // Bracket lookalikes
      .replace(/[［【]/g, "(")
      .replace(/[］】]/g, ")")
      .replace(/[｛]/g, "(")
      .replace(/[｝]/g, ")")
      // Separator lookalikes
      .replace(/[·•‧]/g, ",")
      .replace(/[；]/g, ";")
      .replace(/[，、]/g, ",")
      // Collapse whitespace, including the newlines OCR inserts mid-word
      .replace(/ /g, " ")
      .replace(/\s*\n\s*/g, " ")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

/** Isolates the ingredients block from the full label text. */
export function extractIngredientsBlock(text: string): string {
  const repaired = repairOcr(text);

  let start = -1;
  let startLen = 0;
  for (const marker of START_MARKERS) {
    const m = repaired.match(marker);
    if (m && m.index !== undefined && (start === -1 || m.index < start)) {
      start = m.index;
      startLen = m[0].length;
    }
  }

  // No explicit "INGREDIENTS:" header — treat the whole blob as candidate
  // text rather than giving up. Many small local packs omit the header.
  let body = start === -1 ? repaired : repaired.slice(start + startLen);

  let end = body.length;
  for (const marker of END_MARKERS) {
    const m = body.match(marker);
    if (m && m.index !== undefined && m.index < end) end = m.index;
  }

  return normaliseBlock(body.slice(0, end));
}

/**
 * Indian packs split the list into labelled sub-sections — "TASTEMAKER:",
 * "SEASONING:", "NOODLE BLOCK:" — and end sub-lists with a full stop. Both
 * are ingredient boundaries, but neither is a comma, so without this the
 * header glues itself onto the next ingredient
 * ("Acidity Regulators. TASTEMAKER: Sugar" resolving as one token).
 */
function normaliseBlock(text: string): string {
  return text
    // A sub-section header: a short run of letters followed by a colon.
    .replace(/\b[A-Za-z][A-Za-z &-]{2,24}\s*:/g, ", ")
    // Sentence boundaries inside the list are separators too. Guarded so
    // decimals ("0.5 g") and abbreviations are left alone.
    .replace(/\.(?=\s+[A-Za-z(])/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Splits on commas and semicolons at bracket depth 0, so
 * "Sugar, Oil (Palmolein, Antioxidant (INS 319))" does not shatter.
 */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);

    if ((ch === "," || ch === ";") && depth === 0) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

/**
 * "Acidity Regulator (INS 330)" → ["Acidity Regulator", "INS 330"].
 * Recurses, because Indian labels nest brackets two and three deep.
 */
function explodeBrackets(token: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let outer = "";
  let inner = "";

  for (const ch of token) {
    if (ch === "(" || ch === "[") {
      depth++;
      if (depth === 1) continue;
    } else if (ch === ")" || ch === "]") {
      depth--;
      if (depth === 0) {
        for (const piece of splitTopLevel(inner)) out.push(...explodeBrackets(piece));
        inner = "";
        continue;
      }
    }
    if (depth === 0) outer += ch;
    else inner += ch;
  }
  // Unbalanced bracket (OCR dropped one) — keep whatever we collected.
  if (inner.trim()) {
    for (const piece of splitTopLevel(inner)) out.push(...explodeBrackets(piece));
  }
  if (outer.trim()) out.unshift(outer);
  return out;
}

/** Strips percentages, leading numerals, footnote marks and stray punctuation. */
function cleanToken(token: string): string {
  return token
    .replace(/\d+(\.\d+)?\s*%/g, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/[*†‡#]+/g, "")
    .replace(/\s*\.+\s*$/, "")
    .replace(/^[\s\-–—:;.]+|[\s\-–—:;.]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isNoise(token: string): boolean {
  const t = token.trim();
  if (t.length < 2) return true;
  return NOISE.some((re) => re.test(t));
}

/** Normalises for matching: lowercase, no punctuation, singular-ish. */
function normaliseForMatch(token: string): string {
  return token
    .toLowerCase()
    .replace(/[.\-_'’]/g, " ")
    .replace(/[^a-z0-9ऀ-ॿ ]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Resolves one cleaned token against the bundled DB. */
export function matchIngredient(
  token: string
): { ingredient: Ingredient | null; confidence: number } {
  const norm = normaliseForMatch(token);
  if (!norm) return { ingredient: null, confidence: 0 };

  // 1. Exact alias hit — the common case.
  const exact = ALIAS_INDEX.get(norm);
  if (exact) return { ingredient: exact, confidence: 1 };

  // 2. Bare INS/E code, e.g. "ins 330" or "e330".
  const code = norm.match(/\b(?:ins|e)\s?(\d{3,4}[a-z]{0,2})\b/);
  if (code) {
    const byCode =
      ALIAS_INDEX.get(`ins ${code[1]}`) ?? ALIAS_INDEX.get(`e${code[1]}`);
    if (byCode) return { ingredient: byCode, confidence: 1 };
    // Known-format code we simply do not carry yet. Say so honestly.
    return { ingredient: null, confidence: 0 };
  }

  // 3. Longest-alias substring match, so "refined wheat flour" beats "flour".
  for (const { alias, ing } of ALIASES_BY_LENGTH) {
    if (alias.length < 4) continue;
    if (norm.includes(alias)) {
      // Confidence drops as the matched fragment covers less of the token.
      const coverage = alias.length / norm.length;
      return { ingredient: ing, confidence: coverage > 0.55 ? 0.9 : 0.7 };
    }
  }

  // 4. Token-overlap fallback for reordered wording
  //    ("flour, wheat, whole" vs "whole wheat flour").
  const words = new Set(norm.split(" ").filter((w) => w.length > 3));
  if (words.size) {
    let best: { ing: Ingredient; score: number } | null = null;
    for (const { alias, ing } of ALIASES_BY_LENGTH) {
      const aWords = alias.split(" ").filter((w) => w.length > 3);
      if (!aWords.length) continue;
      const hits = aWords.filter((w) => words.has(w)).length;
      const score = hits / aWords.length;
      if (score >= 0.75 && (!best || score > best.score)) best = { ing, score };
    }
    if (best) return { ingredient: best.ing, confidence: 0.65 };
  }

  return { ingredient: null, confidence: 0 };
}

/** Full pipeline: raw label text → resolved, de-duplicated ingredient list. */
export function parseIngredients(rawText: string): ResolvedIngredient[] {
  const block = extractIngredientsBlock(rawText);
  if (!block) return [];

  const tokens: string[] = [];
  for (const part of splitTopLevel(block)) {
    for (const piece of explodeBrackets(part)) {
      const cleaned = cleanToken(piece);
      if (cleaned && !isNoise(cleaned)) tokens.push(cleaned);
    }
  }

  const seen = new Set<string>();
  const out: ResolvedIngredient[] = [];

  for (const token of tokens) {
    const { ingredient, confidence } = matchIngredient(token);
    // De-duplicate by resolved identity where we have one, else by raw text —
    // a label naming palm oil three times should show it once.
    const key = ingredient ? `id:${ingredient.id}` : `raw:${normaliseForMatch(token)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      raw: token,
      ingredient,
      verdict: ingredient ? ingredient.verdict : "unknown",
      confidence,
    });
  }

  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   NUTRITION PANEL — read it when the photo happens to include it.
   ═══════════════════════════════════════════════════════════════════ */

const NUTRIENT_PATTERNS: { key: keyof Nutrition; re: RegExp; unit: "g" | "mg" | "kcal" }[] = [
  { key: "calories", re: /(?:energy|calories|कैलोरी|ऊर्जा)[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*k?cal/i, unit: "kcal" },
  { key: "protein_g", re: /protein[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "carbs_g", re: /carbohydrates?[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "sugar_g", re: /(?:total\s+)?sugars?[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "fat_g", re: /(?:total\s+)?fat[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "sat_fat_g", re: /saturated[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "trans_fat_g", re: /trans[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "fibre_g", re: /(?:dietary\s+)?fibre?[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*g/i, unit: "g" },
  { key: "sodium_mg", re: /sodium[^\d\n]{0,24}?(\d+(?:\.\d+)?)\s*(mg|g)/i, unit: "mg" },
];

export function parseNutrition(rawText: string): Nutrition {
  const text = repairOcr(rawText);
  const out: Nutrition = {};

  for (const { key, re } of NUTRIENT_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    let value = parseFloat(m[1]);
    if (!Number.isFinite(value)) continue;
    // Sodium is often printed in grams; normalise to mg.
    if (key === "sodium_mg" && m[2]?.toLowerCase() === "g") value *= 1000;
    (out[key] as number) = value;
  }

  const serving = text.match(/serving\s+size[^\d\n]{0,16}?(\d+(?:\.\d+)?)\s*g/i);
  if (serving) out.serving_size_g = parseFloat(serving[1]);

  return out;
}

/**
 * Best-effort product name: the most title-like line near the top.
 * Deliberately splits the ORIGINAL text, because repairOcr collapses the
 * newlines that tell us where one line ends and the next begins.
 */
export function guessProductName(rawText: string): string {
  // A product name is printed ABOVE the ingredients panel, never inside it.
  // Restricting the search to the text before the marker is what stops us
  // naming a scan after one of its own ingredient lines.
  let head = rawText;
  for (const marker of START_MARKERS) {
    const m = rawText.match(marker);
    if (m && m.index !== undefined) {
      head = rawText.slice(0, m.index);
      break;
    }
  }

  const lines = head
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 48);

  for (const line of lines.slice(0, 6)) {
    if (
      /ingredient|nutrition|net wt|net quantity|fssai|mfg|best before|batch|energy|protein|carbohydrate/i.test(
        line
      )
    )
      continue;
    // A line that is mostly digits is a weight, a code or a price.
    if ((line.replace(/\D/g, "").length / line.length) > 0.3) continue;

    // A comma-separated run is list text that leaked above the marker, not a
    // title. We deliberately do NOT reject lines that name a known
    // ingredient: for whole foods the product name IS the ingredient
    // ("Rolled Oats", "Peanut Butter", "Coconut Water").
    if ((line.match(/,/g) ?? []).length >= 2) continue;
    if (/[,;]\s*$/.test(line)) continue;

    return line;
  }
  return "";
}
