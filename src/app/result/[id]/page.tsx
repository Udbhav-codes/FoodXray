"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { IngredientRow } from "@/components/IngredientRow";
import { ProductCard } from "@/components/ProductCard";
import {
  AiAlternativeCard,
  AiBadge,
  AiSectionHeading,
  AiSkeleton,
  AiSources,
  AskPanel,
} from "@/components/AiBits";
import { useAiAlternatives, useAiAvailable, useAiExplanation, useAsk } from "@/lib/ai";
import {
  AppBar,
  Button,
  Disclaimer,
  SectionHeading,
  Sheet,
  Toast,
} from "@/components/UI";
import { GradePill, IngredientRibbon, ScoreBadge, VERDICT_STYLE } from "@/components/Verdict";
import { pick } from "@/lib/i18n";
import { ALLERGEN_META, CONDITION_META, nutrientLoads } from "@/lib/personalise";
import { GRADE_META, WEIGHTS } from "@/lib/score";
import { findAlternatives, ingredientsFor } from "@/lib/scan";
import { useStore } from "@/lib/store";
import { computeTargets } from "@/lib/targets";
import type { PersonalVerdictLevel, Verdict } from "@/lib/types";

const LEVEL_TONE: Record<PersonalVerdictLevel, Verdict> = {
  good_for_you: "good",
  okay_occasionally: "average",
  limit: "average",
  not_recommended: "avoid",
  do_not_eat: "avoid",
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    t, lang, ready, history, profiles, activeProfileId, setActiveProfile, addLogEntry,
    aiEnabled,
  } = useStore();

  const scan = useMemo(() => history.find((h) => h.scan_id === id), [history, id]);

  const [whyOpen, setWhyOpen] = useState(false);
  const [nutriOpen, setNutriOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (ready && !scan) router.replace("/");
  }, [ready, scan, router]);

  // Everything below must be computed BEFORE the early return, because the
  // AI hooks that follow have to run on every render to keep hook order stable.
  // Whose verdict are we showing? Falls back to the general assessment.
  const viewedProfile =
    profiles.find((p) => p.profile_id === activeProfileId) ?? profiles[0] ?? null;
  const verdict = scan?.verdicts.find(
    (v) => v.profileId === (viewedProfile?.profile_id ?? "default")
  ) ?? scan?.verdicts[0];

  const items = useMemo(
    () => (scan ? ingredientsFor(scan, viewedProfile) : []),
    [scan, viewedProfile]
  );

  // ── Gemini: explanation, live alternatives, Q&A ──
  // Each falls back to the deterministic output already on screen.
  const ruleExplanation = verdict
    ? pick(lang, verdict.explanation_en, verdict.explanation_hi)
    : "";

  // AI runs only when the user has it on AND the server actually has a key.
  // Without both, no AI surface is shown at all — an Ask box that is
  // guaranteed to fail is worse than no Ask box.
  const aiOn = useAiAvailable();
  const useAi = aiEnabled && aiOn === true;

  const ai = useAiExplanation(scan, items, viewedProfile, lang, ruleExplanation, useAi);
  const liveAlts = useAiAlternatives(scan, items, viewedProfile, lang, useAi);
  const askApi = useAsk(scan, items, viewedProfile, lang);

  if (!ready || !scan || !verdict) return <div className="min-h-dvh bg-paper" />;

  const ribbon = items.reduce(
    (acc, r) => ({ ...acc, [r.verdict]: acc[r.verdict] + 1 }),
    { good: 0, average: 0, avoid: 0, unknown: 0 }
  );

  const alternatives = findAlternatives(scan.product_category, scan.score, viewedProfile);
  const gradeMeta = GRADE_META[scan.grade];
  const tone = VERDICT_STYLE[LEVEL_TONE[verdict.level]];
  const isGeneral = !viewedProfile;

  const jumpTo = (v: Verdict) => {
    const idx = items.findIndex((r) => r.verdict === v);
    if (idx < 0) return;
    document
      .getElementById(`ing-${idx}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const share = async () => {
    const text = `${scan.product_name} — ${scan.score}/100 (Grade ${scan.grade})\n${
      ribbon.good
    } good · ${ribbon.average} average · ${ribbon.avoid} avoid\n— FoodXray`;
    try {
      if (navigator.share) await navigator.share({ title: scan.product_name, text });
      else {
        await navigator.clipboard.writeText(text);
        setToast(t("copied"));
      }
    } catch {
      /* user dismissed the share sheet — nothing to report */
    }
  };

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar
        title={t("result")}
        onBack
        right={
          <button
            type="button"
            onClick={share}
            className="press grid h-11 w-11 place-items-center rounded-full text-ink-600 hover:bg-surface-2"
          >
            <Icon name="share" size={19} title={t("share")} />
          </button>
        }
      />

      {/* ── A · Overall verdict ──────────────────────────────────── */}
      <section className="shell pt-5 text-center">
        <p className="truncate text-[13px] font-medium text-ink-600">
          {scan.product_name}
        </p>

        <div className="mt-3 flex justify-center">
          <ScoreBadge score={scan.score} grade={scan.grade} />
        </div>

        <p className="mt-3 flex items-center justify-center gap-2.5 text-[15px] font-semibold">
          <GradePill grade={scan.grade} />
          <span>{pick(lang, gradeMeta.label_en, gradeMeta.label_hi)}</span>
        </p>

        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="press mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-leaf-700 hover:bg-leaf-50"
        >
          <Icon name="info" size={15} />
          {t("whyThis")}
        </button>

        {/* ⭐ The Ingredient Ribbon */}
        <div className="mt-5">
          <IngredientRibbon counts={ribbon} onJump={jumpTo} />
        </div>
      </section>

      {/* ── Family switcher — "one scan, four verdicts" ───────────── */}
      {profiles.length > 1 && (
        <section className="shell mt-6">
          <SectionHeading>{t("whoIsEating")}</SectionHeading>
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {profiles.map((p) => {
              const theirs = scan.verdicts.find((v) => v.profileId === p.profile_id);
              const theirTone = theirs ? VERDICT_STYLE[LEVEL_TONE[theirs.level]] : null;
              const on = p.profile_id === viewedProfile?.profile_id;
              return (
                <li key={p.profile_id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveProfile(p.profile_id)}
                    aria-pressed={on}
                    className={`press flex min-h-[52px] items-center gap-2.5 rounded-full border px-3.5 ${
                      on
                        ? "border-leaf-600 bg-leaf-50"
                        : "border-ink-200 bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[13px] font-bold text-ink-900">
                      {(p.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-left">
                      <span className="block text-[13px] font-semibold leading-tight">
                        {p.name || t("profileTitle")}
                      </span>
                      {theirs && theirTone && (
                        <span className={`block text-[11px] font-medium ${theirTone.fg}`}>
                          {pick(lang, theirs.headline_en, theirs.headline_hi)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── B · Personal verdict ─────────────────────────────────── */}
      <section className="shell mt-5">
        <div className={`rounded-[20px] border p-5 ${tone.bg} border-current/15`}>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
            <Icon name={isGeneral ? "info" : "profile"} size={15} />
            {isGeneral ? (
              <>
                {t("generalAssessment")} · {t("averageAdult")}
              </>
            ) : (
              <>
                {t("forYou")}, {viewedProfile.name || "—"}
                {viewedProfile.age ? ` (${viewedProfile.age})` : ""}
                {viewedProfile.conditions.length > 0 &&
                  ` · ${viewedProfile.conditions
                    .map((c) => pick(lang, CONDITION_META[c].label_en, CONDITION_META[c].label_hi))
                    .join(", ")}`}
              </>
            )}
          </p>

          <p className={`mt-3 flex items-center gap-2 text-[19px] font-semibold ${tone.fg}`}>
            <Icon name={tone.icon} size={21} strokeWidth={2.6} />
            {/* The headline comes from the rules engine and is never
                AI-generated — it is the verdict itself, not prose. */}
            {pick(lang, verdict.headline_en, verdict.headline_hi)}
            {ai.isAi && <AiBadge />}
          </p>

          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-900">{ai.text}</p>

          {ai.state === "loading" && (
            <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-400">
              <span className="a-leaf inline-flex text-leaf-600">
                <Icon name="leaf" size={12} />
              </span>
              {t("aiWriting")}
            </p>
          )}

          {verdict.hardBlocks.length > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-[12px] bg-avoid px-3.5 py-2.5 text-[13px] font-semibold text-white">
              <Icon name="alert" size={16} />
              {lang === "hi" ? "एलर्जी चेतावनी: " : "Allergy alert: "}
              {verdict.hardBlocks
                .map((a) => pick(lang, ALLERGEN_META[a].label_en, ALLERGEN_META[a].label_hi))
                .join(", ")}
            </p>
          )}

          {isGeneral && (
            <Link
              href="/profile"
              className="press mt-4 flex min-h-[48px] items-center gap-2.5 rounded-[14px] bg-surface px-4 text-[13px] font-semibold text-leaf-700 hover:bg-surface-2"
            >
              <Icon name="sparkle" size={16} />
              <span className="flex-1">{t("saveProfilePrompt")}</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          )}
        </div>
      </section>

      {/* OCR honesty: tell the user when the read was shaky. */}
      {typeof scan.ocrConfidence === "number" && scan.ocrConfidence < 70 && (
        <section className="shell mt-4">
          <p className="flex items-start gap-2.5 rounded-[14px] border border-average/30 bg-average-bg px-4 py-3 text-[13px] text-average-ink">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {t("lowConfidence")}
          </p>
        </section>
      )}

      {/* ── C · Ingredient breakdown ─────────────────────────────── */}
      <section className="shell mt-7">
        <SectionHeading count={`${items.length} ${t("found")}`}>
          {t("ingredientsLabel")}
        </SectionHeading>
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <IngredientRow key={`${item.raw}-${i}`} item={item} index={i} />
          ))}
        </ul>
      </section>

      {/* ── D · Nutrition calculator ─────────────────────────────── */}
      <section className="shell mt-5">
        <button
          type="button"
          onClick={() => setNutriOpen(true)}
          className="press flex min-h-[58px] w-full items-center gap-3.5 rounded-[18px] border border-ink-200 bg-surface px-5 hover:bg-surface-2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-600">
            <Icon name="chart" size={18} />
          </span>
          <span className="flex-1 text-left text-[14px] font-semibold">
            {t("nutritionCalc")}
          </span>
          <Icon name="chevronRight" size={18} className="text-ink-400" />
        </button>
      </section>

      {/* ── E · Alternatives ─────────────────────────────────────── */}
      {/* Live, search-grounded results when AI is on; the bundled catalogue
          otherwise. Both are labelled so the user knows which they are seeing. */}
      {useAi && (liveAlts.state === "loading" || liveAlts.items.length > 0) && (
        <section className="shell mt-7">
          <AiSectionHeading
            titleKey="liveAlternatives"
            state={liveAlts.state}
            onRetry={liveAlts.retry}
          />

          {liveAlts.state === "loading" ? (
            <div className="rounded-[18px] border border-ink-200 bg-surface p-4">
              <p className="mb-3 flex items-center gap-2 text-[13px] text-ink-600">
                <span className="a-leaf inline-flex text-leaf-600">
                  <Icon name="leaf" size={14} />
                </span>
                {t("aiSearching")}
              </p>
              <AiSkeleton lines={3} />
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {liveAlts.items.map((item) => (
                  <AiAlternativeCard key={`${item.brand}-${item.name}`} item={item} />
                ))}
              </ul>

              {/* Spec §12.4: never overpromise stock. */}
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-ink-400">
                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                {t("notStockChecked")}
              </p>

              <AiSources sources={liveAlts.sources} />
            </>
          )}
        </section>
      )}

      {/* Bundled catalogue — always available, and the only list when AI is off. */}
      {alternatives.length > 0 && (
        <section className="shell mt-7">
          <SectionHeading
            action={
              <Link
                href={`/alternatives?category=${scan.product_category}`}
                className="text-[13px] font-semibold text-leaf-700 hover:underline"
              >
                {t("seeAll")} →
              </Link>
            }
          >
            {useAi && liveAlts.items.length > 0
              ? t("seedAlternatives")
              : t("betterOptions")}
          </SectionHeading>
          <ul className="space-y-2.5">
            {alternatives.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-400">{t("seedNote")}</p>
        </section>
      )}

      {/* ── Ask anything about this label ────────────────────────── */}
      {useAi && (
        <section className="shell mt-7">
          <AskPanel
            answer={askApi.answer}
            state={askApi.state}
            onAsk={askApi.ask}
            onReset={askApi.reset}
          />
        </section>
      )}

      {/* ── F · Footer ───────────────────────────────────────────── */}
      <section className="shell mt-7 space-y-4">
        <div className="flex gap-2.5">
          <Button variant="secondary" icon="share" className="flex-1" onClick={share}>
            {t("share")}
          </Button>
          <Button
            variant="ghost"
            icon="flag"
            className="flex-1"
            onClick={() =>
              setToast(
                lang === "hi"
                  ? "धन्यवाद — हम इसे जांच के लिए भेज देंगे।"
                  : "Thanks — we'll send this for review."
              )
            }
          >
            {t("reportWrong")}
          </Button>
        </div>
        <Disclaimer />
        <p className="text-center text-[12px] text-ink-400">{t("formulationsChange")}</p>
      </section>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      <WhySheet open={whyOpen} onClose={() => setWhyOpen(false)} scan={scan} />
      <NutritionSheet
        open={nutriOpen}
        onClose={() => setNutriOpen(false)}
        scan={scan}
        onAdd={(grams, nutrition) => {
          addLogEntry("snacks", {
            name: scan.product_name,
            grams,
            nutrition,
            grade: scan.grade,
          });
          setNutriOpen(false);
          setToast(t("addedToPlan"));
        }}
      />

      <Toast message={toast} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   "Why this score?" — the transparency play. TruthIn publishes its
   45/45/10; FactsScan publishes nothing. We show the actual arithmetic.
   ───────────────────────────────────────────────────────────────── */
function WhySheet({
  open,
  onClose,
  scan,
}: {
  open: boolean;
  onClose: () => void;
  scan: NonNullable<ReturnType<typeof useStore>["history"][number]>;
}) {
  const { t, lang } = useStore();
  const b = scan.breakdown;

  const rows = [
    { label: lang === "hi" ? "पोषण प्रोफ़ाइल" : "Nutritional profile", value: b.nutrition, weight: WEIGHTS.nutrition },
    { label: lang === "hi" ? "सामग्री की गुणवत्ता" : "Ingredient quality", value: b.ingredients, weight: WEIGHTS.ingredients },
    { label: lang === "hi" ? "प्रोसेसिंग स्तर" : "Processing level", value: b.processing, weight: WEIGHTS.processing },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("howWeScore")}>
      <p className="mb-5 text-[13.5px] leading-relaxed text-ink-600">
        {lang === "hi"
          ? "हम अपना तरीका खुलकर बताते हैं। यही स्कोर हर बार, हर किसी के लिए एक जैसा बनता है — इसमें कोई AI अंदाज़ा नहीं लगाता।"
          : "We publish our method openly. The same label always produces the same number — no AI guesswork decides this."}
      </p>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold">{r.label}</span>
              <span className="font-data text-[13px] text-ink-600">
                {r.value}/100 × {Math.round(r.weight * 100)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-leaf-600"
                style={{ width: `${r.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-4">
        <span className="text-[15px] font-semibold">
          {lang === "hi" ? "कुल स्कोर" : "Final score"}
        </span>
        <span className="font-data text-[22px] font-semibold text-leaf-700">
          {scan.score}/100
        </span>
      </div>

      {(lang === "hi" ? b.notes_hi : b.notes_en).length > 0 && (
        <ul className="mt-5 space-y-2">
          {(lang === "hi" ? b.notes_hi : b.notes_en).map((note, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-600"
            >
              <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-400" />
              {note}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Nutrition calculator (spec §7.3.1) — serving stepper plus daily
   values measured against THIS person's caps.
   ───────────────────────────────────────────────────────────────── */
function NutritionSheet({
  open,
  onClose,
  scan,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  scan: NonNullable<ReturnType<typeof useStore>["history"][number]>;
  onAdd: (grams: number, nutrition: Record<string, number>) => void;
}) {
  const { t, lang, activeProfile } = useStore();
  const [grams, setGrams] = useState(scan.nutrition.serving_size_g ?? 30);

  const base = scan.nutrition.serving_size_g ?? 100;
  const factor = grams / base;
  const has = Object.keys(scan.nutrition).some(
    (k) => k !== "serving_size_g" && typeof (scan.nutrition as Record<string, unknown>)[k] === "number"
  );

  const scaled = (v?: number) => (typeof v === "number" ? v * factor : undefined);
  const loads = nutrientLoads(scan.nutrition, activeProfile, grams);
  const targets = computeTargets(activeProfile);

  const macros = [
    { value: scaled(scan.nutrition.calories), label: t("calories"), digits: 0 },
    { value: scaled(scan.nutrition.protein_g), label: t("protein"), digits: 1, unit: "g" },
    { value: scaled(scan.nutrition.carbs_g), label: t("carbs"), digits: 1, unit: "g" },
    { value: scaled(scan.nutrition.fat_g), label: t("fat"), digits: 1, unit: "g" },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("nutritionPerServing")}>
      {!has ? (
        <p className="rounded-[14px] bg-surface-2 px-4 py-4 text-[13.5px] leading-relaxed text-ink-600">
          {t("noNutritionPanel")}
        </p>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between gap-4">
            <span className="text-[14px] font-semibold">{t("servingSize")}</span>
            <div className="flex items-center gap-1 rounded-full border border-ink-200 bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setGrams((g) => Math.max(5, g - 5))}
                className="press grid h-10 w-10 place-items-center rounded-full text-ink-900 hover:bg-surface"
              >
                <Icon name="minus" size={17} title={lang === "hi" ? "घटाएं" : "Decrease"} />
              </button>
              <span className="w-16 text-center font-data text-[15px] font-semibold">
                {grams} g
              </span>
              <button
                type="button"
                onClick={() => setGrams((g) => Math.min(500, g + 5))}
                className="press grid h-10 w-10 place-items-center rounded-full text-ink-900 hover:bg-surface"
              >
                <Icon name="plus" size={17} title={lang === "hi" ? "बढ़ाएं" : "Increase"} />
              </button>
            </div>
          </div>

          <ul className="mb-5 grid grid-cols-4 gap-2">
            {macros.map((m) => (
              <li
                key={m.label}
                className="rounded-[14px] bg-surface-2 px-2 py-3 text-center"
              >
                <span className="block font-data text-[17px] font-semibold">
                  {typeof m.value === "number" ? m.value.toFixed(m.digits) : "—"}
                  {m.unit && typeof m.value === "number" && (
                    <span className="text-[12px] font-normal">{m.unit}</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-600">{m.label}</span>
              </li>
            ))}
          </ul>

          {loads.length > 0 && (
            <>
              <ul className="space-y-3.5">
                {loads.map((load) => (
                  <li key={load.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-medium">
                        {pick(lang, load.label_en, load.label_hi)}
                      </span>
                      <span className="font-data text-[13px] text-ink-600">
                        {load.amount.toFixed(load.unit === "mg" ? 0 : 1)}
                        {load.unit} ·{" "}
                        <span
                          className={
                            load.pct >= 50 ? "font-semibold text-avoid-ink" : ""
                          }
                        >
                          {load.pct}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full ${
                          load.pct >= 50 ? "bg-avoid" : load.pct >= 25 ? "bg-average" : "bg-leaf-600"
                        }`}
                        style={{ width: `${Math.min(100, load.pct)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-3.5 text-[12px] text-ink-400">
                {t("ofYourDaily")}
                {activeProfile?.name ? ` · ${activeProfile.name}` : ` · ${t("averageAdult")}`}
                {` · ${targets.calories} kcal`}
              </p>
            </>
          )}

          <div className="mt-6">
            <Button
              icon="plus"
              full
              onClick={() =>
                onAdd(grams, {
                  calories: scaled(scan.nutrition.calories) ?? 0,
                  protein_g: scaled(scan.nutrition.protein_g) ?? 0,
                  carbs_g: scaled(scan.nutrition.carbs_g) ?? 0,
                  fat_g: scaled(scan.nutrition.fat_g) ?? 0,
                  sugar_g: scaled(scan.nutrition.sugar_g) ?? 0,
                  sodium_mg: scaled(scan.nutrition.sodium_mg) ?? 0,
                  sat_fat_g: scaled(scan.nutrition.sat_fat_g) ?? 0,
                  fibre_g: scaled(scan.nutrition.fibre_g) ?? 0,
                })
              }
            >
              {t("addToPlan")}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
