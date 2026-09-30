import type { DailyTargets, UserProfile } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   DAILY TARGETS — Mifflin-St Jeor BMR × activity factor, then tightened
   by condition. Spec §7.5 and §10.3.
   ═══════════════════════════════════════════════════════════════════ */

const ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

/** WHO general adult + ICMR-NIN Indian RDA baseline (spec §10.3). */
export const DEFAULT_TARGETS: DailyTargets = {
  calories: 2000,
  protein_g: 55,
  carbs_g: 250,
  fat_g: 67,
  sugar_g: 25,
  sodium_mg: 2000,
  fibre_g: 30,
  sat_fat_g: 20,
};

export function computeTargets(profile: UserProfile | null): DailyTargets {
  if (!profile || !profile.weight_kg || !profile.height_cm || !profile.age) {
    return applyConditionCaps({ ...DEFAULT_TARGETS }, profile?.conditions ?? []);
  }

  const { weight_kg: w, height_cm: h, age } = profile;

  const bmrMale = 10 * w + 6.25 * h - 5 * age + 5;
  const bmrFemale = 10 * w + 6.25 * h - 5 * age - 161;
  const bmr =
    profile.sex === "male"
      ? bmrMale
      : profile.sex === "female"
        ? bmrFemale
        : (bmrMale + bmrFemale) / 2;

  let calories = bmr * ACTIVITY_FACTOR[profile.activity_level];

  if (profile.goal === "lose_weight") calories *= 0.85;
  else if (profile.goal === "gain_weight") calories *= 1.15;
  else if (profile.goal === "build_muscle") calories *= 1.1;

  calories = Math.round(calories / 10) * 10;

  // Protein by body weight, lifted for muscle goals.
  const proteinPerKg = profile.goal === "build_muscle" ? 1.6 : 1.0;
  const protein_g = Math.round(w * proteinPerKg);

  const fat_g = Math.round((calories * 0.28) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);

  const targets: DailyTargets = {
    calories,
    protein_g,
    carbs_g: Math.max(80, carbs_g),
    fat_g,
    // WHO: free sugars under 10% of energy, ideally under 5%.
    sugar_g: Math.round((calories * 0.05) / 4),
    sodium_mg: 2000,
    fibre_g: Math.max(25, Math.round((calories / 1000) * 14)),
    sat_fat_g: Math.round((calories * 0.1) / 9),
  };

  return applyConditionCaps(targets, profile.conditions);
}

/** Conditions only ever tighten a cap — never loosen one. Spec §10.2. */
function applyConditionCaps(
  t: DailyTargets,
  conditions: UserProfile["conditions"]
): DailyTargets {
  const out = { ...t };
  const has = (c: string) => conditions.includes(c as never);

  if (has("diabetes_t2") || has("pcos")) out.sugar_g = Math.min(out.sugar_g, 25);
  if (has("hypertension")) out.sodium_mg = Math.min(out.sodium_mg, 1500);
  if (has("kidney")) out.sodium_mg = Math.min(out.sodium_mg, 1500);
  if (has("heart")) {
    out.sat_fat_g = Math.min(out.sat_fat_g, 15);
    out.sodium_mg = Math.min(out.sodium_mg, 1500);
  }

  return out;
}

export function bmiOf(profile: UserProfile | null): {
  value: number;
  band_en: string;
  band_hi: string;
} | null {
  if (!profile?.weight_kg || !profile?.height_cm) return null;
  const m = profile.height_cm / 100;
  const value = profile.weight_kg / (m * m);

  // Asian-Indian BMI cut-offs (ICMR), which are lower than the WHO defaults.
  let band_en: string, band_hi: string;
  if (value < 18.5) [band_en, band_hi] = ["Underweight", "कम वज़न"];
  else if (value < 23) [band_en, band_hi] = ["Healthy weight", "स्वस्थ वज़न"];
  else if (value < 25) [band_en, band_hi] = ["Slightly overweight", "थोड़ा ज़्यादा वज़न"];
  else if (value < 30) [band_en, band_hi] = ["Overweight", "अधिक वज़न"];
  else [band_en, band_hi] = ["Obese", "मोटापा"];

  return { value: Math.round(value * 10) / 10, band_en, band_hi };
}
