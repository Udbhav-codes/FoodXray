/** Core domain types for PoshanLens. Mirrors the spec §9 and §13. */

export type Lang = "en" | "hi";

export type Verdict = "good" | "average" | "avoid" | "unknown";

/** Health conditions the personalisation engine understands (spec §10.2). */
export type ConditionId =
  | "diabetes_t2"
  | "hypertension"
  | "kidney"
  | "heart"
  | "pregnancy"
  | "pcos"
  | "thyroid"
  | "celiac";

export type AllergenId =
  | "peanut"
  | "treenut"
  | "milk"
  | "egg"
  | "soy"
  | "gluten"
  | "fish"
  | "shellfish"
  | "sesame";

export type DietPreference =
  | "vegetarian"
  | "non_vegetarian"
  | "vegan"
  | "eggetarian"
  | "jain";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Sex = "male" | "female" | "unspecified";

export type Goal =
  | "maintain"
  | "lose_weight"
  | "gain_weight"
  | "manage_blood_sugar"
  | "lower_bp"
  | "build_muscle";

/** Which nutrient a condition rule watches, used to explain *why* a flag fired. */
export type NutrientKey =
  | "sugar_g"
  | "sodium_mg"
  | "sat_fat_g"
  | "trans_fat_g"
  | "fibre_g"
  | "protein_g"
  | "calories"
  | "carbs_g"
  | "fat_g";

/** One row of the bundled ingredient database (spec §9). */
export interface Ingredient {
  /** Canonical key. */
  id: string;
  /** Every printed spelling that should resolve to this row, lowercased. */
  aliases: string[];
  code?: string | null;
  name_en: string;
  name_hi: string;
  scientific?: string;
  category: IngredientCategory;
  what_en: string;
  what_hi: string;
  verdict: Verdict;
  reason_en: string;
  reason_hi: string;
  /** 0 = harmless, 10 = worst. Drives the ingredient-quality 40% (spec §8.1). */
  penalty: number;
  /** Conditions for which this ingredient escalates to a warning. */
  watch?: ConditionId[];
  allergens?: AllergenId[];
  /** A sugar under another name — flagged hard for diabetes/PCOS. */
  isSugarAlias?: boolean;
  /** Carries sodium that the tongue cannot detect. */
  isSodiumSource?: boolean;
  /** NOVA-style marker: presence implies industrial formulation. */
  isUltraProcessedMarker?: boolean;
}

export type IngredientCategory =
  | "grain"
  | "sweetener"
  | "fat"
  | "protein"
  | "dairy"
  | "salt"
  | "preservative"
  | "colour"
  | "flavour"
  | "emulsifier"
  | "stabiliser"
  | "acidity_regulator"
  | "raising_agent"
  | "antioxidant"
  | "anticaking"
  | "thickener"
  | "sweetener_artificial"
  | "vitamin"
  | "fruit_veg"
  | "spice"
  | "nut"
  | "other";

/** An ingredient after it has been matched against the DB and the profile. */
export interface ResolvedIngredient {
  raw: string;
  ingredient: Ingredient | null;
  /** Verdict after personalisation; may be harsher than ingredient.verdict. */
  verdict: Verdict;
  /** Personal note explaining an escalation, if one fired. */
  personalNote_en?: string;
  personalNote_hi?: string;
  /** True when this ingredient matches a declared allergy — a hard block. */
  allergenHit?: AllergenId;
  confidence: number;
}

export interface Nutrition {
  serving_size_g?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fat_g?: number;
  sat_fat_g?: number;
  trans_fat_g?: number;
  fibre_g?: number;
  sodium_mg?: number;
}

export interface DailyTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  sodium_mg: number;
  fibre_g: number;
  sat_fat_g: number;
}

export interface UserProfile {
  profile_id: string;
  is_primary: boolean;
  name: string;
  age?: number;
  sex: Sex;
  height_cm?: number;
  weight_kg?: number;
  activity_level: ActivityLevel;
  conditions: ConditionId[];
  allergies: AllergenId[];
  diet_preference?: DietPreference;
  goal: Goal;
  created_at: string;
  updated_at: string;
}

export type Grade = "A" | "B" | "C" | "D" | "E";

export interface RibbonCounts {
  good: number;
  average: number;
  avoid: number;
  unknown: number;
}

export interface ScoreBreakdown {
  /** 0–100 each, before weighting. Published openly — spec §8.1. */
  nutrition: number;
  ingredients: number;
  processing: number;
  /** NOVA 1–4. */
  novaGroup: 1 | 2 | 3 | 4;
  notes_en: string[];
  notes_hi: string[];
}

export type PersonalVerdictLevel =
  | "good_for_you"
  | "okay_occasionally"
  | "limit"
  | "not_recommended"
  | "do_not_eat";

export interface PersonalVerdict {
  level: PersonalVerdictLevel;
  headline_en: string;
  headline_hi: string;
  explanation_en: string;
  explanation_hi: string;
  triggered: string[];
  hardBlocks: AllergenId[];
  /** Per-profile, for the family switcher. */
  profileId: string;
  profileName: string;
}

export interface ScanResult {
  scan_id: string;
  timestamp: string;
  capture_method: "ocr" | "text" | "sample" | "barcode";
  raw_text: string;
  product_name: string;
  product_category: string;
  ingredients: ResolvedIngredient[];
  nutrition: Nutrition;
  score: number;
  grade: Grade;
  breakdown: ScoreBreakdown;
  ribbon: RibbonCounts;
  /** One entry per household profile — the "one scan, four verdicts" moment. */
  verdicts: PersonalVerdict[];
  ocrConfidence?: number;
}

export interface Product {
  product_id: string;
  name_en: string;
  name_hi: string;
  brand: string;
  category: string;
  score: number;
  grade: Grade;
  benefits_en: string[];
  benefits_hi: string[];
  nutrition: Nutrition;
  ingredientIds: string[];
  allergens: AllergenId[];
  diet: DietPreference[];
  availability: {
    /** Honest labelling — we never claim confirmed stock without an API. */
    typical_retail: boolean;
    quick_commerce: string[];
  };
}

export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";

export interface LogEntry {
  entry_id: string;
  slot: MealSlot;
  name: string;
  grams: number;
  nutrition: Nutrition;
  grade?: Grade;
  at: string;
}

export interface DayLog {
  /** YYYY-MM-DD, local. */
  date: string;
  entries: LogEntry[];
}
