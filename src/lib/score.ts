import type {
  Grade,
  Nutrition,
  ResolvedIngredient,
  RibbonCounts,
  ScoreBreakdown,
} from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   SCORING — spec §8.1. Rule-based, deterministic, and published openly.
   No LLM touches this. The same label always yields the same number.

     40%  nutritional profile   (FSSAI / WHO per-100g thresholds)
     40%  ingredient quality    (penalty weights, position-adjusted)
     20%  processing level      (NOVA-style 1–4)
   ═══════════════════════════════════════════════════════════════════ */

export const WEIGHTS = { nutrition: 0.4, ingredients: 0.4, processing: 0.2 } as const;

/** Per-100g thresholds. Sources: WHO adult guidance + FSSAI labelling rules. */
/**
 * Drinks need their own sugar scale. Nobody eats 100g of biscuit in one go,
 * but a 250ml glass is normal — so 13g/100ml, which reads as "medium" on the
 * solid scale, is actually a whole day's sugar in one drink. Nutri-Score
 * separates beverages for the same reason.
 */
export const BEVERAGE_SUGAR = { low: 1.5, mid: 4.5, high: 9 } as const;

export const THRESHOLDS = {
  sugar_g: { low: 5, mid: 10, high: 22.5 },
  sodium_mg: { low: 120, mid: 360, high: 600 },
  sat_fat_g: { low: 1.5, mid: 5, high: 10 },
  trans_fat_g: { low: 0.1, mid: 0.2, high: 0.5 },
  fibre_g: { poor: 3, good: 6 },
  protein_g: { poor: 5, good: 8 },
} as const;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Past the "very high" threshold the penalty keeps growing, up to `extra`.
 * Without this a product at 2.6× the sodium limit scores the same as one
 * barely over it, which is neither honest nor useful.
 */
function overshoot(value: number, high: number, base: number, extra: number): number {
  if (value <= high) return base;
  return base + Math.min(extra, ((value - high) / high) * extra);
}

/** Scales nutrition figures to a per-100g basis so thresholds apply. */
function per100g(nutrition: Nutrition): Nutrition {
  const serving = nutrition.serving_size_g;
  // Values on Indian labels are usually already per 100g. Only rescale when a
  // serving size is given AND it is clearly not 100g.
  if (!serving || Math.abs(serving - 100) < 1) return nutrition;
  const factor = 100 / serving;
  const out: Nutrition = { serving_size_g: serving };
  for (const [k, v] of Object.entries(nutrition)) {
    if (k === "serving_size_g" || typeof v !== "number") continue;
    (out as Record<string, number>)[k] = v * factor;
  }
  return out;
}

interface NutritionScore {
  score: number;
  notes_en: string[];
  notes_hi: string[];
  /** False when the label gave us nothing to work with. */
  hasData: boolean;
}

function scoreNutrition(nutrition: Nutrition, isBeverage: boolean): NutritionScore {
  const n = per100g(nutrition);
  const notes_en: string[] = [];
  const notes_hi: string[] = [];

  const known = [n.sugar_g, n.sodium_mg, n.sat_fat_g, n.fibre_g, n.protein_g].filter(
    (v) => typeof v === "number"
  ).length;

  if (known === 0) {
    return { score: 50, notes_en: [], notes_hi: [], hasData: false };
  }

  let score = 100;

  if (typeof n.sugar_g === "number") {
    const t = isBeverage ? BEVERAGE_SUGAR : THRESHOLDS.sugar_g;
    if (n.sugar_g > t.high) {
      score -= overshoot(n.sugar_g, t.high, 30, 12);
      notes_en.push(`Very high sugar (${n.sugar_g.toFixed(1)}g per 100${isBeverage ? "ml" : "g"})`);
      notes_hi.push(`चीनी बहुत ज़्यादा (${n.sugar_g.toFixed(1)} ग्राम प्रति 100 ${isBeverage ? "मि.ली." : "ग्राम"})`);
    } else if (n.sugar_g > t.mid) {
      score -= 16;
      notes_en.push(`High sugar (${n.sugar_g.toFixed(1)}g per 100${isBeverage ? "ml" : "g"})`);
      notes_hi.push(`चीनी ज़्यादा (${n.sugar_g.toFixed(1)} ग्राम प्रति 100 ${isBeverage ? "मि.ली." : "ग्राम"})`);
    } else if (n.sugar_g > t.low) {
      score -= 6;
    }
  }

  if (typeof n.sodium_mg === "number") {
    const t = THRESHOLDS.sodium_mg;
    if (n.sodium_mg > t.high) {
      score -= overshoot(n.sodium_mg, t.high, 28, 14);
      notes_en.push(`Very high sodium (${Math.round(n.sodium_mg)}mg per 100g)`);
      notes_hi.push(`सोडियम बहुत ज़्यादा (${Math.round(n.sodium_mg)} मि.ग्रा. प्रति 100 ग्राम)`);
    } else if (n.sodium_mg > t.mid) {
      score -= 15;
      notes_en.push(`High sodium (${Math.round(n.sodium_mg)}mg per 100g)`);
      notes_hi.push(`सोडियम ज़्यादा (${Math.round(n.sodium_mg)} मि.ग्रा. प्रति 100 ग्राम)`);
    } else if (n.sodium_mg > t.low) {
      score -= 5;
    }
  }

  if (typeof n.sat_fat_g === "number") {
    const t = THRESHOLDS.sat_fat_g;
    if (n.sat_fat_g > t.high) {
      score -= overshoot(n.sat_fat_g, t.high, 22, 10);
      notes_en.push(`Very high saturated fat (${n.sat_fat_g.toFixed(1)}g per 100g)`);
      notes_hi.push(`सैचुरेटेड फैट बहुत ज़्यादा (${n.sat_fat_g.toFixed(1)} ग्राम प्रति 100 ग्राम)`);
    } else if (n.sat_fat_g > t.mid) {
      score -= 12;
      notes_en.push(`High saturated fat (${n.sat_fat_g.toFixed(1)}g per 100g)`);
      notes_hi.push(`सैचुरेटेड फैट ज़्यादा (${n.sat_fat_g.toFixed(1)} ग्राम प्रति 100 ग्राम)`);
    } else if (n.sat_fat_g > t.low) {
      score -= 4;
    }
  }

  // Trans fat is the one nutrient with no safe level, so it is punished hardest.
  if (typeof n.trans_fat_g === "number" && n.trans_fat_g > THRESHOLDS.trans_fat_g.low) {
    score -= n.trans_fat_g > THRESHOLDS.trans_fat_g.mid ? 30 : 15;
    notes_en.push(`Contains trans fat (${n.trans_fat_g.toFixed(2)}g per 100g)`);
    notes_hi.push(`ट्रांस फैट मौजूद (${n.trans_fat_g.toFixed(2)} ग्राम प्रति 100 ग्राम)`);
  }

  if (typeof n.fibre_g === "number") {
    if (n.fibre_g >= THRESHOLDS.fibre_g.good) {
      score += 12;
      notes_en.push(`Good source of fibre (${n.fibre_g.toFixed(1)}g per 100g)`);
      notes_hi.push(`फाइबर अच्छा (${n.fibre_g.toFixed(1)} ग्राम प्रति 100 ग्राम)`);
    } else if (n.fibre_g >= THRESHOLDS.fibre_g.poor) {
      score += 5;
    }
  }

  if (typeof n.protein_g === "number") {
    if (n.protein_g >= THRESHOLDS.protein_g.good) {
      score += 10;
      notes_en.push(`Good source of protein (${n.protein_g.toFixed(1)}g per 100g)`);
      notes_hi.push(`प्रोटीन अच्छा (${n.protein_g.toFixed(1)} ग्राम प्रति 100 ग्राम)`);
    } else if (n.protein_g >= THRESHOLDS.protein_g.poor) {
      score += 4;
    }
  }

  return { score: clamp(score), notes_en, notes_hi, hasData: true };
}

/**
 * Ingredient quality. Position matters: Indian labels list ingredients in
 * descending quantity, so palm oil listed second is a bigger problem than
 * palm oil listed twelfth. Unknown ingredients are never penalised — we do
 * not punish a product for a gap in our own database.
 */
function scoreIngredients(list: ResolvedIngredient[]): {
  score: number;
  notes_en: string[];
  notes_hi: string[];
} {
  const known = list.filter((r) => r.ingredient);
  if (!known.length) {
    return { score: 50, notes_en: [], notes_hi: [] };
  }

  let weighted = 0;
  let maxWeighted = 0;
  const worst: ResolvedIngredient[] = [];

  known.forEach((r, i) => {
    const w = 1 / (1 + 0.2 * i);
    weighted += (r.ingredient!.penalty / 10) * w;
    maxWeighted += w;
    if (r.ingredient!.penalty >= 6) worst.push(r);
  });

  const avgRatio = weighted / maxWeighted;

  // Harm does not average out. A pure average lets a product bury four bad
  // ingredients among ten harmless ones and still land mid-table, so the
  // three worst offenders are blended back in alongside the average.
  const topPenalties = known
    .map((r) => r.ingredient!.penalty)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const worstRatio =
    topPenalties.reduce((s, p) => s + p, 0) / (topPenalties.length * 10);

  const score = clamp(100 * (1 - (0.6 * avgRatio + 0.4 * worstRatio)));

  const notes_en: string[] = [];
  const notes_hi: string[] = [];
  if (worst.length) {
    const names_en = worst.slice(0, 3).map((r) => r.ingredient!.name_en);
    const names_hi = worst.slice(0, 3).map((r) => r.ingredient!.name_hi);
    notes_en.push(`Ingredients of concern: ${names_en.join(", ")}`);
    notes_hi.push(`चिंता वाली सामग्री: ${names_hi.join(", ")}`);
  }

  return { score, notes_en, notes_hi };
}

/** NOVA-style processing classification from additive markers and list length. */
function scoreProcessing(list: ResolvedIngredient[]): {
  score: number;
  nova: 1 | 2 | 3 | 4;
  notes_en: string[];
  notes_hi: string[];
} {
  const known = list.filter((r) => r.ingredient);
  const markers = known.filter((r) => r.ingredient!.isUltraProcessedMarker).length;
  const additiveCategories = new Set([
    "preservative",
    "colour",
    "flavour",
    "emulsifier",
    "stabiliser",
    "antioxidant",
    "anticaking",
    "sweetener_artificial",
  ]);
  const additives = known.filter((r) => additiveCategories.has(r.ingredient!.category)).length;

  let nova: 1 | 2 | 3 | 4;
  // Two cosmetic/industrial markers together (say an artificial colour plus a
  // synthetic flavour) already put a product firmly in the ultra-processed
  // group — it cannot exist outside a factory.
  if (markers >= 2 || (markers >= 1 && additives >= 3)) nova = 4;
  else if (markers >= 1 || additives >= 2) nova = 3;
  else if (additives >= 1 || list.length > 6) nova = 2;
  else nova = 1;

  const score = { 1: 100, 2: 82, 3: 52, 4: 20 }[nova];

  const label_en = {
    1: "Unprocessed or minimally processed",
    2: "Processed culinary ingredient",
    3: "Processed food",
    4: "Ultra-processed food",
  }[nova];
  const label_hi = {
    1: "बिना प्रोसेस या बहुत कम प्रोसेस्ड",
    2: "रसोई में इस्तेमाल होने वाली प्रोसेस्ड सामग्री",
    3: "प्रोसेस्ड खाना",
    4: "अल्ट्रा-प्रोसेस्ड खाना",
  }[nova];

  return {
    score,
    nova,
    notes_en: [`NOVA group ${nova} — ${label_en}`],
    notes_hi: [`NOVA समूह ${nova} — ${label_hi}`],
  };
}

export function gradeFor(score: number): Grade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  if (score >= 25) return "D";
  return "E";
}

export const GRADE_META: Record<
  Grade,
  { label_en: string; label_hi: string; verdict: "good" | "average" | "avoid" }
> = {
  A: { label_en: "Good — eat freely", label_hi: "अच्छा — बेझिझक खाएं", verdict: "good" },
  B: { label_en: "Good — minor concerns", label_hi: "अच्छा — थोड़ी सावधानी", verdict: "good" },
  C: { label_en: "Average — occasional", label_hi: "ठीक-ठाक — कभी-कभी", verdict: "average" },
  D: { label_en: "Not good — limit", label_hi: "ठीक नहीं — कम करें", verdict: "average" },
  E: { label_en: "Avoid", label_hi: "बचें", verdict: "avoid" },
};

export function ribbonFor(list: ResolvedIngredient[]): RibbonCounts {
  const counts: RibbonCounts = { good: 0, average: 0, avoid: 0, unknown: 0 };
  for (const r of list) counts[r.verdict]++;
  return counts;
}

export interface ScoredLabel {
  score: number;
  grade: Grade;
  breakdown: ScoreBreakdown;
}

export function scoreLabel(
  list: ResolvedIngredient[],
  nutrition: Nutrition,
  options: { isBeverage?: boolean } = {}
): ScoredLabel {
  const nut = scoreNutrition(nutrition, options.isBeverage ?? false);
  const ing = scoreIngredients(list);
  const proc = scoreProcessing(list);

  let score: number;
  const notes_en = [...nut.notes_en, ...ing.notes_en, ...proc.notes_en];
  const notes_hi = [...nut.notes_hi, ...ing.notes_hi, ...proc.notes_hi];

  if (nut.hasData) {
    score =
      nut.score * WEIGHTS.nutrition +
      ing.score * WEIGHTS.ingredients +
      proc.score * WEIGHTS.processing;
  } else {
    // No nutrition panel in the photo. Rather than invent numbers, redistribute
    // that 40% across the two components we *can* measure, and say so.
    score = ing.score * (2 / 3) + proc.score * (1 / 3);
    notes_en.push("No nutrition panel found — scored on ingredients and processing only.");
    notes_hi.push("पोषण तालिका नहीं मिली — सिर्फ़ सामग्री और प्रोसेसिंग से अंक दिए गए।");
  }

  const rounded = Math.round(clamp(score));

  return {
    score: rounded,
    grade: gradeFor(rounded),
    breakdown: {
      nutrition: Math.round(nut.score),
      ingredients: Math.round(ing.score),
      processing: Math.round(proc.score),
      novaGroup: proc.nova,
      notes_en,
      notes_hi,
    },
  };
}
