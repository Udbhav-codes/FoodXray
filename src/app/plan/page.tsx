"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { GradePill } from "@/components/Verdict";
import {
  AppBar, Button, EmptyState, Field, ProgressBar, SectionHeading, Sheet, inputClass,
} from "@/components/UI";
import { useStore, todayKey } from "@/lib/store";
import { computeTargets } from "@/lib/targets";
import type { MealSlot, Nutrition } from "@/lib/types";

const SLOTS: { id: MealSlot; key: string }[] = [
  { id: "breakfast", key: "breakfast" },
  { id: "lunch", key: "lunch" },
  { id: "snacks", key: "snacks" },
  { id: "dinner", key: "dinner" },
];

export default function PlanPage() {
  const { t, lang, ready, activeProfile, logFor, addLogEntry, removeLogEntry } = useStore();
  const [addingTo, setAddingTo] = useState<MealSlot | null>(null);
  const [offset, setOffset] = useState(0);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const dateKey = todayKey(date);

  const targets = computeTargets(activeProfile);
  const log = logFor(dateKey);

  const totals = log.entries.reduce<Required<Pick<Nutrition,
    "calories" | "protein_g" | "carbs_g" | "fat_g" | "sugar_g" | "sodium_mg" | "fibre_g">>>(
    (acc, e) => ({
      calories: acc.calories + (e.nutrition.calories ?? 0),
      protein_g: acc.protein_g + (e.nutrition.protein_g ?? 0),
      carbs_g: acc.carbs_g + (e.nutrition.carbs_g ?? 0),
      fat_g: acc.fat_g + (e.nutrition.fat_g ?? 0),
      sugar_g: acc.sugar_g + (e.nutrition.sugar_g ?? 0),
      sodium_mg: acc.sodium_mg + (e.nutrition.sodium_mg ?? 0),
      fibre_g: acc.fibre_g + (e.nutrition.fibre_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0, fibre_g: 0 }
  );

  const kcalPct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  const ring = 2 * Math.PI * 44;

  const macros = [
    { label: t("protein"), value: totals.protein_g, cap: targets.protein_g, unit: "g" },
    { label: t("carbs"), value: totals.carbs_g, cap: targets.carbs_g, unit: "g" },
    { label: t("fat"), value: totals.fat_g, cap: targets.fat_g, unit: "g" },
    { label: t("sugar"), value: totals.sugar_g, cap: targets.sugar_g, unit: "g" },
    { label: t("sodium"), value: totals.sodium_mg, cap: targets.sodium_mg, unit: "mg" },
    { label: t("fibre"), value: totals.fibre_g, cap: targets.fibre_g, unit: "g", higherIsBetter: true },
  ];

  // Nudges, never shaming. No streaks, no punishment (spec §18.3).
  const nudges: string[] = [];
  if (totals.sugar_g > targets.sugar_g) nudges.push(t("overSugar"));
  if (totals.sodium_mg > targets.sodium_mg) nudges.push(t("overSodium"));
  if (log.entries.length > 2 && totals.protein_g < targets.protein_g * 0.5)
    nudges.push(t("lowProtein"));

  if (!ready) return <div className="min-h-dvh bg-paper" />;

  const dayLabel =
    offset === 0
      ? t("planTitle")
      : date.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
          day: "numeric",
          month: "short",
        });

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar title={t("navPlan")} />

      <div className="shell pt-4">
        {/* Date stepper */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="press grid h-11 w-11 place-items-center rounded-full text-ink-600 hover:bg-surface-2"
          >
            <Icon name="arrowLeft" size={19} title={lang === "hi" ? "पिछला दिन" : "Previous day"} />
          </button>
          <p className="text-[16px] font-semibold">{dayLabel}</p>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            className="press grid h-11 w-11 place-items-center rounded-full text-ink-600 hover:bg-surface-2 disabled:opacity-30"
          >
            <Icon name="chevronRight" size={19} title={lang === "hi" ? "अगला दिन" : "Next day"} />
          </button>
        </div>

        {/* Calorie ring */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative grid h-[168px] w-[168px] place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={totals.calories > targets.calories ? "var(--verdict-average)" : "var(--leaf-600)"}
                strokeWidth="7"
                // Round cap on a zero-length dash would paint a stray dot.
                strokeLinecap={kcalPct > 0 ? "round" : "butt"}
                strokeDasharray={`${(kcalPct / 100) * ring} ${ring}`}
                style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)" }}
              />
            </svg>
            <div className="text-center leading-none">
              <span className="block font-data text-[30px] font-semibold">
                {Math.round(totals.calories).toLocaleString()}
              </span>
              <span className="mt-1.5 block text-[12px] text-ink-600">
                {lang === "hi" ? "में से" : "of"} {targets.calories.toLocaleString()}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-400">kcal</span>
            </div>
          </div>

          {!activeProfile && (
            <p className="mt-2 text-center text-[12px] text-ink-400">
              {lang === "hi"
                ? "औसत वयस्क के लक्ष्य — प्रोफ़ाइल सेव करें तो ये आपके हिसाब से बनेंगे।"
                : "Average-adult targets — save a profile to make these yours."}
            </p>
          )}
        </div>

        {/* Macros */}
        <ul className="mt-6 space-y-3.5">
          {macros.map((m) => {
            const over = m.higherIsBetter ? false : m.value > m.cap;
            return (
              <li key={m.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                    {m.label}
                    {over && <Icon name="alert" size={14} className="text-avoid" />}
                  </span>
                  <span className={`font-data text-[13px] ${over ? "font-semibold text-avoid-ink" : "text-ink-600"}`}>
                    {Math.round(m.value)} / {Math.round(m.cap)} {m.unit}
                  </span>
                </div>
                <ProgressBar value={m.value} max={m.cap} />
              </li>
            );
          })}
        </ul>

        {nudges.length > 0 && (
          <ul className="mt-5 space-y-2">
            {nudges.map((n) => (
              <li
                key={n}
                className="flex items-start gap-2.5 rounded-[14px] bg-average-bg px-4 py-3 text-[13px] font-medium text-average-ink"
              >
                <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        )}

        {/* Meals */}
        <section className="mt-7 space-y-5">
          {SLOTS.map((slot) => {
            const entries = log.entries.filter((e) => e.slot === slot.id);
            const kcal = entries.reduce((s, e) => s + (e.nutrition.calories ?? 0), 0);

            return (
              <div key={slot.id}>
                <SectionHeading
                  count={kcal > 0 ? `${Math.round(kcal)} kcal` : undefined}
                  action={
                    <button
                      type="button"
                      onClick={() => setAddingTo(slot.id)}
                      className="press grid h-9 w-9 place-items-center rounded-full bg-leaf-50 text-leaf-700 hover:bg-leaf-200"
                    >
                      <Icon name="plus" size={17} title={`${t("addFood")} — ${t(slot.key)}`} />
                    </button>
                  }
                >
                  {t(slot.key)}
                </SectionHeading>

                {entries.length === 0 ? (
                  <p className="rounded-[14px] border border-dashed border-ink-200 px-4 py-3.5 text-[13px] text-ink-400">
                    {t("nothingLogged")}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((e) => (
                      <li
                        key={e.entry_id}
                        className="flex items-center gap-3 rounded-[14px] border border-ink-200 bg-surface px-4 py-3"
                      >
                        {e.grade && <GradePill grade={e.grade} className="shrink-0" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{e.name}</span>
                          <span className="block font-data text-[12px] text-ink-600">
                            {e.grams} g · {Math.round(e.nutrition.calories ?? 0)} kcal
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLogEntry(dateKey, e.entry_id)}
                          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-avoid-bg hover:text-avoid-ink"
                        >
                          <Icon name="trash" size={17} title={`${t("remove")} ${e.name}`} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {log.entries.length === 0 && (
          <div className="mt-7">
            <EmptyState icon="plan" text={t("emptyPlan")} />
          </div>
        )}
      </div>

      <AddFoodSheet
        slot={addingTo}
        onClose={() => setAddingTo(null)}
        onAdd={(slot, entry) => {
          addLogEntry(slot, entry);
          setAddingTo(null);
        }}
      />
    </div>
  );
}

function AddFoodSheet({
  slot,
  onClose,
  onAdd,
}: {
  slot: MealSlot | null;
  onClose: () => void;
  onAdd: (
    slot: MealSlot,
    entry: { name: string; grams: number; nutrition: Nutrition }
  ) => void;
}) {
  const { t, lang, history } = useStore();
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("100");
  const [kcal, setKcal] = useState("");

  if (!slot) return null;

  const reset = () => {
    setName("");
    setGrams("100");
    setKcal("");
  };

  return (
    <Sheet open onClose={onClose} title={`${t("addFood")} · ${t(slot)}`}>
      {/* Anything already scanned can go straight in — one tap (spec §7.5). */}
      {history.length > 0 && (
        <section className="mb-6">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("recentScans")}
          </p>
          <ul className="space-y-2">
            {history.slice(0, 5).map((scan) => (
              <li key={scan.scan_id}>
                <button
                  type="button"
                  onClick={() => {
                    const serving = scan.nutrition.serving_size_g ?? 100;
                    onAdd(slot, {
                      name: scan.product_name,
                      grams: serving,
                      nutrition: scan.nutrition,
                    });
                    reset();
                  }}
                  className="press flex w-full items-center gap-3 rounded-[14px] border border-ink-200 bg-surface px-4 py-3 text-left hover:bg-surface-2"
                >
                  <GradePill grade={scan.grade} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                    {scan.product_name}
                  </span>
                  <Icon name="plus" size={17} className="shrink-0 text-leaf-600" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
          {lang === "hi" ? "खुद जोड़ें" : "Add manually"}
        </p>

        <Field label={lang === "hi" ? "खाने का नाम" : "Food name"}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={lang === "hi" ? "जैसे: पोहा" : "e.g. Poha"}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === "hi" ? "मात्रा (ग्राम)" : "Amount (g)"}>
            <input
              value={grams}
              onChange={(e) => setGrams(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={`${inputClass} font-data`}
            />
          </Field>
          <Field label="kcal">
            <input
              value={kcal}
              onChange={(e) => setKcal(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={`${inputClass} font-data`}
            />
          </Field>
        </div>

        <Button
          full
          icon="plus"
          disabled={!name.trim() || !kcal}
          onClick={() => {
            onAdd(slot, {
              name: name.trim(),
              grams: Number(grams) || 100,
              nutrition: { calories: Number(kcal) || 0, serving_size_g: Number(grams) || 100 },
            });
            reset();
          }}
        >
          {t("addFood")}
        </Button>
      </section>
    </Sheet>
  );
}
