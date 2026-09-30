import { computeTargets } from "@/lib/targets";
import type {
  AllergenId,
  ConditionId,
  Grade,
  Nutrition,
  PersonalVerdict,
  PersonalVerdictLevel,
  ResolvedIngredient,
  UserProfile,
} from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   PERSONALISATION — Layer 1 of spec §10.1: deterministic rules only.
   Auditable, testable, and incapable of hallucinating. The optional
   Gemini layer rephrases what this decides; it never overrides it.
   ═══════════════════════════════════════════════════════════════════ */

export const CONDITION_META: Record<
  ConditionId,
  { label_en: string; label_hi: string }
> = {
  diabetes_t2: { label_en: "Diabetes", label_hi: "डायबिटीज़" },
  hypertension: { label_en: "High BP", label_hi: "हाई बीपी" },
  kidney: { label_en: "Kidney", label_hi: "किडनी" },
  heart: { label_en: "Heart / Cholesterol", label_hi: "दिल / कोलेस्ट्रॉल" },
  pregnancy: { label_en: "Pregnant", label_hi: "गर्भवती" },
  pcos: { label_en: "PCOS", label_hi: "पीसीओएस" },
  thyroid: { label_en: "Thyroid", label_hi: "थायरॉइड" },
  celiac: { label_en: "Celiac / Gluten", label_hi: "सीलिएक / ग्लूटेन" },
};

export const ALLERGEN_META: Record<
  AllergenId,
  { label_en: string; label_hi: string }
> = {
  peanut: { label_en: "Peanut", label_hi: "मूंगफली" },
  treenut: { label_en: "Tree nuts", label_hi: "मेवे" },
  milk: { label_en: "Milk", label_hi: "दूध" },
  egg: { label_en: "Egg", label_hi: "अंडा" },
  soy: { label_en: "Soy", label_hi: "सोया" },
  gluten: { label_en: "Wheat / Gluten", label_hi: "गेहूं / ग्लूटेन" },
  fish: { label_en: "Fish", label_hi: "मछली" },
  shellfish: { label_en: "Shellfish", label_hi: "शेलफ़िश" },
  sesame: { label_en: "Sesame", label_hi: "तिल" },
};

/** Why a condition escalated a particular ingredient, in both languages. */
const ESCALATION_COPY: Record<
  ConditionId,
  { en: (name: string) => string; hi: (name: string) => string }
> = {
  diabetes_t2: {
    en: (n) => `${n} raises blood sugar quickly.`,
    hi: (n) => `${n} शुगर तेज़ी से बढ़ाता है।`,
  },
  hypertension: {
    en: (n) => `${n} adds sodium you cannot taste.`,
    hi: (n) => `${n} ऐसा सोडियम जोड़ता है जो चखने में पता नहीं चलता।`,
  },
  kidney: {
    en: (n) => `${n} adds phosphate or sodium load.`,
    hi: (n) => `${n} फॉस्फेट या सोडियम का बोझ बढ़ाता है।`,
  },
  heart: {
    en: (n) => `${n} raises saturated or trans fat.`,
    hi: (n) => `${n} सैचुरेटेड या ट्रांस फैट बढ़ाता है।`,
  },
  pregnancy: {
    en: (n) => `${n} is usually limited during pregnancy.`,
    hi: (n) => `गर्भावस्था में ${n} आमतौर पर सीमित रखा जाता है।`,
  },
  pcos: {
    en: (n) => `${n} worsens insulin resistance.`,
    hi: (n) => `${n} इंसुलिन रेज़िस्टेंस बढ़ाता है।`,
  },
  thyroid: {
    en: (n) => `${n} in quantity may affect thyroid function.`,
    hi: (n) => `ज़्यादा मात्रा में ${n} थायरॉइड पर असर डाल सकता है।`,
  },
  celiac: {
    en: (n) => `${n} contains gluten.`,
    hi: (n) => `${n} में ग्लूटेन है।`,
  },
};

const LEVEL_COPY: Record<
  PersonalVerdictLevel,
  { en: string; hi: string }
> = {
  good_for_you: { en: "Good for you", hi: "आपके लिए अच्छा" },
  okay_occasionally: { en: "Okay occasionally", hi: "कभी-कभी ठीक है" },
  limit: { en: "Limit this", hi: "इसे सीमित रखें" },
  not_recommended: { en: "Not recommended", hi: "आपके लिए ठीक नहीं" },
  do_not_eat: { en: "Do not eat", hi: "न खाएं" },
};

export function levelCopy(level: PersonalVerdictLevel) {
  return LEVEL_COPY[level];
}

/**
 * Applies profile rules to each ingredient, returning a NEW list. Verdicts can
 * only be escalated (good → average → avoid), never softened: a personalised
 * result must never be more permissive than the general one.
 */
export function personaliseIngredients(
  list: ResolvedIngredient[],
  profile: UserProfile | null
): ResolvedIngredient[] {
  if (!profile) return list;

  const conditions = profile.conditions ?? [];
  const allergies = profile.allergies ?? [];

  return list.map((r): ResolvedIngredient => {
    const ing = r.ingredient;
    if (!ing) return r;

    // ── Hard block: a declared allergy always wins, regardless of score. ──
    const hit = (ing.allergens ?? []).find((a) => allergies.includes(a));
    if (hit) {
      return {
        ...r,
        verdict: "avoid",
        allergenHit: hit,
        personalNote_en: `Contains ${ALLERGEN_META[hit].label_en.toLowerCase()} — you have declared this allergy.`,
        personalNote_hi: `इसमें ${ALLERGEN_META[hit].label_hi} है — आपने इसकी एलर्जी बताई है।`,
      };
    }

    // Celiac is treated as a hard gluten block even without a listed allergy.
    if (conditions.includes("celiac") && (ing.allergens ?? []).includes("gluten")) {
      return {
        ...r,
        verdict: "avoid",
        allergenHit: "gluten",
        personalNote_en: "Contains gluten — not safe with celiac disease.",
        personalNote_hi: "इसमें ग्लूटेन है — सीलिएक में सुरक्षित नहीं।",
      };
    }

    // ── Condition escalation. ──
    const watched = (ing.watch ?? []).filter((c) => conditions.includes(c));

    // Sugar aliases are escalated for diabetes/PCOS even if not listed in
    // `watch`, because hidden sugar is the single most common failure mode.
    const sugarRisk =
      ing.isSugarAlias &&
      (conditions.includes("diabetes_t2") || conditions.includes("pcos"));
    const sodiumRisk =
      ing.isSodiumSource &&
      (conditions.includes("hypertension") || conditions.includes("kidney"));

    if (!watched.length && !sugarRisk && !sodiumRisk) return r;

    const primary: ConditionId =
      watched[0] ??
      (sugarRisk
        ? conditions.includes("diabetes_t2")
          ? "diabetes_t2"
          : "pcos"
        : conditions.includes("hypertension")
          ? "hypertension"
          : "kidney");

    const escalated =
      r.verdict === "good" ? "average" : r.verdict === "average" ? "avoid" : r.verdict;

    return {
      ...r,
      verdict: escalated,
      personalNote_en: ESCALATION_COPY[primary].en(ing.name_en),
      personalNote_hi: ESCALATION_COPY[primary].hi(ing.name_hi),
    };
  });
}

/** How much of this person's daily cap one serving uses. */
export interface NutrientLoad {
  key: "sugar_g" | "sodium_mg" | "sat_fat_g";
  label_en: string;
  label_hi: string;
  amount: number;
  cap: number;
  pct: number;
  unit: string;
}

export function nutrientLoads(
  nutrition: Nutrition,
  profile: UserProfile | null,
  grams?: number
): NutrientLoad[] {
  const targets = computeTargets(profile);
  const base = nutrition.serving_size_g ?? 100;
  const factor = grams ? grams / base : 1;

  const rows: NutrientLoad[] = [];
  const push = (
    key: NutrientLoad["key"],
    label_en: string,
    label_hi: string,
    amount: number | undefined,
    cap: number,
    unit: string
  ) => {
    if (typeof amount !== "number") return;
    const scaled = amount * factor;
    rows.push({
      key,
      label_en,
      label_hi,
      amount: scaled,
      cap,
      pct: Math.round((scaled / cap) * 100),
      unit,
    });
  };

  push("sugar_g", "Sugar", "चीनी", nutrition.sugar_g, targets.sugar_g, "g");
  push("sodium_mg", "Sodium", "सोडियम", nutrition.sodium_mg, targets.sodium_mg, "mg");
  push("sat_fat_g", "Saturated fat", "सैचुरेटेड फैट", nutrition.sat_fat_g, targets.sat_fat_g, "g");

  return rows;
}

/**
 * Turns the rule output into a verdict for one person. Deliberately written
 * so that the *reason* is always traceable back to a named rule.
 */
export function personalVerdict(
  list: ResolvedIngredient[],
  nutrition: Nutrition,
  grade: Grade,
  profile: UserProfile | null
): PersonalVerdict {
  const triggered: string[] = [];
  const hardBlocks: AllergenId[] = [];

  const personalised = profile ? personaliseIngredients(list, profile) : list;

  for (const r of personalised) {
    if (r.allergenHit && !hardBlocks.includes(r.allergenHit)) hardBlocks.push(r.allergenHit);
  }

  // ── Hard block short-circuits everything else. ──
  if (hardBlocks.length) {
    const names_en = hardBlocks.map((a) => ALLERGEN_META[a].label_en.toLowerCase());
    const names_hi = hardBlocks.map((a) => ALLERGEN_META[a].label_hi);
    return {
      level: "do_not_eat",
      headline_en: LEVEL_COPY.do_not_eat.en,
      headline_hi: LEVEL_COPY.do_not_eat.hi,
      explanation_en: `This contains ${names_en.join(" and ")}, which you have listed as an allergy. Skip this one entirely and check the alternatives below.`,
      explanation_hi: `इसमें ${names_hi.join(" और ")} है, जिसकी आपने एलर्जी बताई है। इसे बिल्कुल न लें, नीचे दिए विकल्प देखिए।`,
      triggered: hardBlocks.map((a) => `allergen_${a}`),
      hardBlocks,
      profileId: profile?.profile_id ?? "default",
      profileName: profile?.name ?? "",
    };
  }

  const conditions = profile?.conditions ?? [];
  const targets = computeTargets(profile);

  // ── Collect the specific reasons this product is a problem for this person. ──
  const reasons_en: string[] = [];
  const reasons_hi: string[] = [];
  let severity = 0;

  const flagged = personalised.filter((r) => r.personalNote_en);
  if (flagged.length) {
    severity += Math.min(3, flagged.length);
    const names_en = flagged.slice(0, 3).map((r) => r.ingredient!.name_en);
    const names_hi = flagged.slice(0, 3).map((r) => r.ingredient!.name_hi);
    triggered.push(...flagged.map((r) => `ingredient_${r.ingredient!.id}`));
    reasons_en.push(
      flagged.length === 1
        ? `${names_en[0]} is a concern for you`
        : `${names_en.join(", ")} are concerns for you`
    );
    reasons_hi.push(`${names_hi.join(", ")} आपके लिए ध्यान देने की बात है`);
  }

  // Hidden sugars deserve their own callout — this is the Rajesh problem.
  const hiddenSugars = personalised.filter(
    (r) => r.ingredient?.isSugarAlias && r.ingredient.id !== "sugar"
  );
  if (
    hiddenSugars.length >= 2 &&
    (conditions.includes("diabetes_t2") || conditions.includes("pcos"))
  ) {
    severity += 1;
    triggered.push("hidden_sugars");
    reasons_en.push(
      `it hides ${hiddenSugars.length} sugars under other names (${hiddenSugars
        .slice(0, 3)
        .map((r) => r.ingredient!.name_en)
        .join(", ")})`
    );
    reasons_hi.push(
      `इसमें ${hiddenSugars.length} चीनियां दूसरे नामों से छुपी हैं (${hiddenSugars
        .slice(0, 3)
        .map((r) => r.ingredient!.name_hi)
        .join(", ")})`
    );
  }

  // Nutrient load against this person's own tightened caps.
  const loads = nutrientLoads(nutrition, profile);
  for (const load of loads) {
    if (load.pct < 40) continue;
    const relevant =
      (load.key === "sugar_g" &&
        (conditions.includes("diabetes_t2") || conditions.includes("pcos"))) ||
      (load.key === "sodium_mg" &&
        (conditions.includes("hypertension") || conditions.includes("kidney"))) ||
      (load.key === "sat_fat_g" && conditions.includes("heart"));

    if (relevant || load.pct >= 60) {
      severity += load.pct >= 70 ? 2 : 1;
      triggered.push(`load_${load.key}`);
      reasons_en.push(
        `one serving uses ${load.pct}% of your daily ${load.label_en.toLowerCase()} limit`
      );
      reasons_hi.push(
        `एक बार खाने में ही आपकी दिन भर की ${load.label_hi} सीमा का ${load.pct}% चला जाता है`
      );
    }
  }

  // ── Map grade + severity to a level. Grade sets the floor; personal
  //    severity can only push it downward, never upward. ──
  let level: PersonalVerdictLevel;
  const gradeBase: Record<Grade, PersonalVerdictLevel> = {
    A: "good_for_you",
    B: "good_for_you",
    C: "okay_occasionally",
    D: "limit",
    E: "not_recommended",
  };
  const ladder: PersonalVerdictLevel[] = [
    "good_for_you",
    "okay_occasionally",
    "limit",
    "not_recommended",
  ];
  const baseIdx = ladder.indexOf(gradeBase[grade]);
  const steps = severity >= 4 ? 2 : severity >= 2 ? 1 : 0;
  level = ladder[Math.min(ladder.length - 1, baseIdx + steps)];

  // ── Compose the explanation. Calm, direct, never alarmist (spec §14.10). ──
  const isGeneral = !profile;
  let explanation_en: string;
  let explanation_hi: string;

  if (reasons_en.length) {
    const lead_en = reasons_en.slice(0, 2).join(", and ");
    const lead_hi = reasons_hi.slice(0, 2).join(", और ");
    explanation_en =
      level === "good_for_you"
        ? `Mostly fine, though ${lead_en}.`
        : `${capitalise(lead_en)}.${
            level === "not_recommended" || level === "limit"
              ? " There are better options below."
              : ""
          }`;
    explanation_hi =
      level === "good_for_you"
        ? `ज़्यादातर ठीक है, बस ${lead_hi}।`
        : `${lead_hi}।${
            level === "not_recommended" || level === "limit"
              ? " नीचे बेहतर विकल्प दिए हैं।"
              : ""
          }`;
  } else {
    const byGrade_en: Record<Grade, string> = {
      A: "Clean ingredient list with nothing to flag. This is a good everyday choice.",
      B: "A solid choice. Nothing here is a problem for you.",
      C: "Fine as an occasional snack, not an everyday food.",
      D: "Heavily processed with little nutritional return. Keep it occasional.",
      E: "Very little here is doing you any good. Worth swapping out.",
    };
    const byGrade_hi: Record<Grade, string> = {
      A: "सामग्री साफ़-सुथरी है, चिंता की कोई बात नहीं। रोज़ के लिए अच्छा विकल्प।",
      B: "अच्छा विकल्प है। आपके लिए यहां कोई दिक्कत नहीं।",
      C: "कभी-कभी खाने के लिए ठीक है, रोज़ के लिए नहीं।",
      D: "बहुत प्रोसेस्ड है और पोषण कम। कभी-कभार ही रखें।",
      E: "इसमें आपके फ़ायदे की चीज़ बहुत कम है। बदलना बेहतर होगा।",
    };
    explanation_en = byGrade_en[grade];
    explanation_hi = byGrade_hi[grade];
  }

  if (isGeneral) {
    explanation_en +=
      " This is a general assessment — save a profile for a result made for your body.";
    explanation_hi +=
      " यह सामान्य आकलन है — अपनी प्रोफ़ाइल सेव करें ताकि नतीजा आपके शरीर के हिसाब से बने।";
  }

  void targets;

  return {
    level,
    headline_en: LEVEL_COPY[level].en,
    headline_hi: LEVEL_COPY[level].hi,
    explanation_en,
    explanation_hi,
    triggered,
    hardBlocks,
    profileId: profile?.profile_id ?? "default",
    profileName: profile?.name ?? "",
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
