"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { AppBar, Button, Chip, EmptyState, SectionHeading, Sheet, inputClass } from "@/components/UI";
import { CATEGORIES, PRODUCTS } from "@/data/products";
import { pick } from "@/lib/i18n";
import { useStore } from "@/lib/store";

type Filter = "gradeA" | "noPalm" | "noSugar" | "highProtein" | "highFibre" | "safeForMe";

export default function AlternativesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <AlternativesInner />
    </Suspense>
  );
}

function AlternativesInner() {
  const params = useSearchParams();
  const { t, lang, activeProfile } = useStore();

  const [category, setCategory] = useState<string | null>(params.get("category"));
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [askLocation, setAskLocation] = useState(false);
  const [nearby, setNearby] = useState(false);

  const toggle = (f: Filter) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const FILTER_LABELS: Record<Filter, { en: string; hi: string }> = {
    gradeA: { en: "Grade A only", hi: "सिर्फ़ ग्रेड A" },
    noPalm: { en: "No palm oil", hi: "पाम तेल नहीं" },
    noSugar: { en: "No added sugar", hi: "चीनी नहीं मिलाई" },
    highProtein: { en: "High protein", hi: "प्रोटीन ज़्यादा" },
    highFibre: { en: "High fibre", hi: "फाइबर ज़्यादा" },
    safeForMe: { en: "Safe for me", hi: "मेरे लिए सुरक्षित" },
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    return PRODUCTS.filter((p) => {
      if (category && p.category !== category) return false;

      if (q) {
        const haystack = `${p.name_en} ${p.name_hi} ${p.brand} ${p.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filters.includes("gradeA") && p.grade !== "A") return false;
      if (filters.includes("noPalm") && p.ingredientIds.includes("palm_oil")) return false;
      if (filters.includes("noSugar") && (p.nutrition.sugar_g ?? 0) > 5) return false;
      if (filters.includes("highProtein") && (p.nutrition.protein_g ?? 0) < 10) return false;
      if (filters.includes("highFibre") && (p.nutrition.fibre_g ?? 0) < 6) return false;

      // "Safe for me" applies the same hard rules the scan engine uses.
      if (filters.includes("safeForMe") && activeProfile) {
        if (p.allergens.some((a) => activeProfile.allergies.includes(a))) return false;
        if (activeProfile.conditions.includes("celiac") && p.allergens.includes("gluten"))
          return false;
        if (activeProfile.diet_preference && !p.diet.includes(activeProfile.diet_preference))
          return false;
      }

      return true;
    }).sort((a, b) => b.score - a.score);
  }, [category, query, filters, activeProfile]);

  const activeCategory = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar title={t("alternativesTitle")} onBack />

      <div className="shell pt-4">
        {/* Search */}
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className={`${inputClass} pl-11`}
          />
        </div>

        {/* Categories */}
        <section className="mt-6">
          <SectionHeading
            action={
              category ? (
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className="text-[13px] font-semibold text-leaf-700 hover:underline"
                >
                  {t("clearFilters")}
                </button>
              ) : undefined
            }
          >
            {t("browseByCategory")}
          </SectionHeading>

          <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-4">
            {CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCategory(on ? null : c.id)}
                    aria-pressed={on}
                    className={`press flex min-h-[80px] w-full flex-col items-center justify-center gap-1.5 rounded-[16px] border px-1.5 py-2.5 ${
                      on
                        ? "border-leaf-600 bg-leaf-50 text-leaf-700"
                        : "border-ink-200 bg-surface text-ink-600 hover:bg-surface-2"
                    }`}
                  >
                    <Icon name={c.icon as IconName} size={24} />
                    <span className="text-center text-[11.5px] font-medium leading-tight">
                      {pick(lang, c.label_en, c.label_hi)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Filters */}
        <section className="mt-6">
          <SectionHeading
            action={
              filters.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilters([])}
                  className="text-[13px] font-semibold text-leaf-700 hover:underline"
                >
                  {t("clearFilters")}
                </button>
              ) : undefined
            }
          >
            {t("filters")}
          </SectionHeading>
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(FILTER_LABELS) as Filter[])
              .filter((f) => f !== "safeForMe" || activeProfile)
              .map((f) => (
                <li key={f} className="shrink-0">
                  <Chip
                    label={pick(lang, FILTER_LABELS[f].en, FILTER_LABELS[f].hi)}
                    selected={filters.includes(f)}
                    onClick={() => toggle(f)}
                  />
                </li>
              ))}
          </ul>
        </section>

        {/* Nearby — permission is requested at the moment of value, never
            at launch (spec §12.3). */}
        <section className="mt-6">
          <SectionHeading>{t("nearYou")}</SectionHeading>
          {nearby ? (
            <p className="flex items-center gap-2.5 rounded-[14px] bg-leaf-50 px-4 py-3 text-[13px] text-leaf-700">
              <Icon name="pin" size={16} className="shrink-0" />
              {lang === "hi"
                ? "आसपास की किराना दुकानें दिखाई जा रही हैं। स्टॉक की पुष्टि नहीं है।"
                : "Showing groceries near you. Stock is not confirmed."}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setAskLocation(true)}
              className="press flex min-h-[52px] w-full items-center gap-3 rounded-[14px] border border-dashed border-ink-200 px-4 text-[13.5px] font-medium text-ink-600 hover:bg-surface-2"
            >
              <Icon name="pin" size={17} className="shrink-0 text-leaf-600" />
              <span className="flex-1 text-left">{t("enableLocation")}</span>
              <Icon name="chevronRight" size={16} className="text-ink-400" />
            </button>
          )}
        </section>

        {/* Results */}
        <section className="mt-7">
          <SectionHeading count={results.length}>
            {activeCategory
              ? pick(lang, activeCategory.label_en, activeCategory.label_hi)
              : t("betterOptions")}
          </SectionHeading>

          {results.length === 0 ? (
            <EmptyState
              icon="search"
              text={t("noAlternatives")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCategory(null);
                    setFilters([]);
                    setQuery("");
                  }}
                >
                  {t("clearFilters")}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {results.map((p) => (
                <ProductCard
                  key={p.product_id}
                  product={p}
                  // Illustrative walking distance, only shown once the user has
                  // actually opted in to location.
                  distanceKm={nearby ? 0.4 + (p.score % 7) * 0.3 : undefined}
                />
              ))}
            </ul>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-ink-400">{t("seedNote")}</p>
        </section>
      </div>

      <Sheet
        open={askLocation}
        onClose={() => setAskLocation(false)}
        title={lang === "hi" ? "इन्हें अपने पास ढूंढें?" : "Find these near you?"}
      >
        <p className="mb-6 text-[14px] leading-relaxed text-ink-600">{t("locationWhy")}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setAskLocation(false)}>
            {t("notNow")}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              // Ask the browser only after the user has said yes to us first.
              navigator.geolocation?.getCurrentPosition(
                () => {
                  setNearby(true);
                  setAskLocation(false);
                },
                () => setAskLocation(false),
                { timeout: 8000 }
              );
            }}
          >
            {t("allow")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
