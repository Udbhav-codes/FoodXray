import { CATEGORIES, guessCategory, PRODUCTS } from "@/data/products";
import { guessProductName, parseIngredients, parseNutrition } from "@/lib/parse";
import { personaliseIngredients, personalVerdict } from "@/lib/personalise";
import { gradeFor, ribbonFor, scoreLabel } from "@/lib/score";
import type { Product, ScanResult, UserProfile } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   SCAN ORCHESTRATION — steps 3 through 9 of the pipeline in spec §8.
   Deliberately synchronous and pure: same input, same output, always.
   ═══════════════════════════════════════════════════════════════════ */

export interface RunScanOptions {
  rawText: string;
  captureMethod: ScanResult["capture_method"];
  /** Every household profile, so one scan yields one verdict per person. */
  profiles: UserProfile[];
  activeProfileId: string | null;
  ocrConfidence?: number;
  productName?: string;
}

export function runScan({
  rawText,
  captureMethod,
  profiles,
  ocrConfidence,
  productName,
}: RunScanOptions): ScanResult {
  const base = parseIngredients(rawText);
  const nutrition = parseNutrition(rawText);

  const detected = productName?.trim() || guessProductName(rawText);

  // Category is resolved before scoring, because drinks are scored on a
  // stricter sugar scale than solids.
  const category = guessCategory(
    `${detected} ${rawText}`,
    base.map((r) => r.ingredient?.id ?? "")
  );

  // When the photo shows only the ingredients panel — which is what we ask
  // for — there is no product name to find. Naming the scan after its own
  // first ingredient line reads as a bug, so fall back to the category.
  const name =
    detected ||
    CATEGORIES.find((c) => c.id === category)?.label_en ||
    "Scanned label";

  const { score, grade, breakdown } = scoreLabel(base, nutrition, {
    isBeverage: category === "drinks",
  });

  // One verdict per profile — the "one scan, four verdicts" moment (spec §5).
  // With no profiles saved we still produce a clearly-labelled general one.
  const verdicts =
    profiles.length > 0
      ? profiles.map((p) => personalVerdict(base, nutrition, grade, p))
      : [personalVerdict(base, nutrition, grade, null)];

  return {
    scan_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    capture_method: captureMethod,
    raw_text: rawText,
    product_name: name,
    product_category: category,
    ingredients: base,
    nutrition,
    score,
    grade,
    breakdown,
    ribbon: ribbonFor(base),
    verdicts,
    ocrConfidence,
  };
}

/** Re-derives the ingredient list as seen by one specific person. */
export function ingredientsFor(
  result: ScanResult,
  profile: UserProfile | null
) {
  return personaliseIngredients(result.ingredients, profile);
}

/**
 * Alternatives lookup (spec §8 step 9): same category, higher score,
 * filtered so we never recommend something the person cannot eat.
 */
export function findAlternatives(
  category: string,
  minScore: number,
  profile: UserProfile | null,
  limit = 4
): Product[] {
  const allergies = profile?.allergies ?? [];
  const conditions = profile?.conditions ?? [];
  const diet = profile?.diet_preference;

  const safe = PRODUCTS.filter((p) => {
    if (p.category !== category) return false;
    if (p.score <= minScore + 4) return false;

    // Never suggest something that triggers a declared allergy.
    if (p.allergens.some((a) => allergies.includes(a))) return false;
    if (conditions.includes("celiac") && p.allergens.includes("gluten")) return false;
    if (diet && !p.diet.includes(diet)) return false;

    return true;
  });

  const sorted = safe.sort((a, b) => b.score - a.score);
  if (sorted.length) return sorted.slice(0, limit);

  // Nothing better in this category. Rather than pad the list with
  // irrelevant products, offer the best genuinely-good options elsewhere.
  return PRODUCTS.filter(
    (p) =>
      p.score >= 80 &&
      !p.allergens.some((a) => allergies.includes(a)) &&
      !(conditions.includes("celiac") && p.allergens.includes("gluten")) &&
      (!diet || p.diet.includes(diet))
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** A worked example so a first-time user can see the payoff before scanning. */
export const SAMPLE_LABELS: {
  id: string;
  name: string;
  name_hi: string;
  text: string;
}[] = [
  {
    id: "noodles",
    name: "Instant Noodles",
    name_hi: "इंस्टेंट नूडल्स",
    text: `MASALA INSTANT NOODLES
INGREDIENTS: Refined Wheat Flour (Maida), Palm Oil, Salt, Wheat Gluten, Thickeners (INS 508, INS 452), Acidity Regulators (INS 501, INS 500).
TASTEMAKER: Sugar, Spices & Condiments, Hydrolysed Vegetable Protein, Flavour Enhancer (INS 621), Maltodextrin, Edible Vegetable Oil (Palmolein), Dehydrated Vegetables, Anticaking Agent (INS 551), Acidity Regulator (INS 330), Colour (INS 150d).
NUTRITIONAL INFORMATION (per 100g): Energy 448 kcal, Protein 9.5 g, Carbohydrate 58.2 g, Total Sugars 4.1 g, Total Fat 18.6 g, Saturated Fat 8.9 g, Trans Fat 0.1 g, Dietary Fibre 2.1 g, Sodium 1560 mg.`,
  },
  {
    id: "biscuit",
    name: "Cream Biscuits",
    name_hi: "क्रीम बिस्किट",
    text: `CHOCOLATE CREAM BISCUITS
INGREDIENTS: Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil (Palmolein), Invert Sugar Syrup, Cocoa Solids, Milk Solids, Liquid Glucose, Raising Agents (INS 500(ii), INS 503(ii)), Emulsifiers (INS 322, INS 471), Salt, Artificial Flavouring Substances, Colour (INS 102).
NUTRITIONAL INFORMATION (per 100g): Energy 492 kcal, Protein 5.8 g, Carbohydrate 68.4 g, Total Sugars 32.6 g, Total Fat 21.4 g, Saturated Fat 11.2 g, Dietary Fibre 1.4 g, Sodium 310 mg.`,
  },
  {
    id: "juice",
    name: "Fruit Drink",
    name_hi: "फ्रूट ड्रिंक",
    text: `MIXED FRUIT JUICE DRINK
INGREDIENTS: Water, Sugar, Fruit Juice Concentrate (12%), Acidity Regulator (INS 330), Stabiliser (INS 415), Preservative (INS 211), Artificial Flavouring Substances, Colour (INS 110).
NUTRITIONAL INFORMATION (per 100 ml): Energy 54 kcal, Protein 0.1 g, Carbohydrate 13.4 g, Total Sugars 13.1 g, Total Fat 0 g, Sodium 18 mg.`,
  },
  {
    id: "oats",
    name: "Rolled Oats",
    name_hi: "रोल्ड ओट्स",
    text: `WHOLE GRAIN ROLLED OATS
INGREDIENTS: Whole Grain Oats (100%).
NUTRITIONAL INFORMATION (per 100g): Energy 389 kcal, Protein 13.2 g, Carbohydrate 62.1 g, Total Sugars 1.1 g, Total Fat 6.9 g, Saturated Fat 1.2 g, Dietary Fibre 10.1 g, Sodium 6 mg.`,
  },
];
