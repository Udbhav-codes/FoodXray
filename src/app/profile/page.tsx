"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  AppBar, Button, Chip, Disclaimer, Field, SectionHeading, Sheet, Toast, inputClass,
} from "@/components/UI";
import { useAiAvailable } from "@/lib/ai";
import { ALLERGEN_META, CONDITION_META } from "@/lib/personalise";
import { newProfile, useStore, type ThemeChoice } from "@/lib/store";
import { bmiOf, computeTargets } from "@/lib/targets";
import type {
  ActivityLevel, AllergenId, ConditionId, DietPreference, Goal, Sex, UserProfile,
} from "@/lib/types";

export default function ProfilePage() {
  const {
    t, lang, setLang, ready, theme, setTheme, profiles, activeProfileId,
    setActiveProfile, saveProfile, removeProfile, wipeAll, exportJson, history,
    aiEnabled, setAiEnabled,
  } = useStore();

  // Distinguishes "the user switched AI off" from "no API key is configured".
  const aiOn = useAiAvailable();

  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!ready) return <div className="min-h-dvh bg-paper" />;

  const active = profiles.find((p) => p.profile_id === activeProfileId) ?? null;
  const targets = computeTargets(active);
  const bmi = bmiOf(active);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foodxray-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar title={t("profileTitle")} />

      <div className="shell space-y-7 pt-4">
        {/* Privacy promise, stated before anything is asked for. */}
        <p className="flex items-start gap-2.5 rounded-[16px] border border-leaf-200 bg-leaf-50 px-4 py-3.5 text-[13px] leading-relaxed text-leaf-700">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
          {t("privacyNote")}
        </p>

        {/* ── Profiles ─────────────────────────────────────────── */}
        <section>
          <SectionHeading count={profiles.length || undefined}>
            {t("familyProfiles")}
          </SectionHeading>

          <ul className="space-y-2.5">
            {profiles.map((p) => {
              const on = p.profile_id === activeProfileId;
              const tags = [
                ...p.conditions.map((c) =>
                  lang === "hi" ? CONDITION_META[c].label_hi : CONDITION_META[c].label_en
                ),
                ...p.allergies.map((a) =>
                  lang === "hi" ? ALLERGEN_META[a].label_hi : ALLERGEN_META[a].label_en
                ),
              ];

              return (
                <li
                  key={p.profile_id}
                  className={`rounded-[18px] border bg-surface ${
                    on ? "border-leaf-600" : "border-ink-200"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => setActiveProfile(p.profile_id)}
                      className="press flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-pressed={on}
                    >
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[16px] font-bold ${
                          on ? "bg-leaf-600 text-white" : "bg-surface-3 text-ink-900"
                        }`}
                      >
                        {(p.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-semibold">
                            {p.name || t("profileTitle")}
                          </span>
                          {p.is_primary && (
                            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                              {t("you")}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-600">
                          {[p.age && `${p.age}`, tags.join(" · ")].filter(Boolean).join(" · ") ||
                            (lang === "hi" ? "जानकारी अधूरी" : "Details incomplete")}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-surface-2"
                    >
                      <Icon name="sliders" size={17} title={`Edit ${p.name || "profile"}`} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3">
            <Button
              variant="secondary"
              icon="plus"
              full
              onClick={() => setEditing(newProfile({ is_primary: profiles.length === 0 }))}
            >
              {profiles.length === 0 ? t("saveProfile") : t("addFamilyMember")}
            </Button>
          </div>
        </section>

        {/* ── Targets ──────────────────────────────────────────── */}
        {active && (
          <section>
            <SectionHeading>{t("yourTargets")}</SectionHeading>
            <div className="rounded-[18px] border border-ink-200 bg-surface p-5">
              {bmi && (
                <p className="mb-4 flex items-baseline gap-2 border-b border-ink-200 pb-3.5">
                  <span className="text-[13px] font-semibold text-ink-600">{t("bmi")}</span>
                  <span className="font-data text-[17px] font-semibold">{bmi.value}</span>
                  <span className="text-[13px] text-ink-600">
                    · {lang === "hi" ? bmi.band_hi : bmi.band_en}
                  </span>
                </p>
              )}
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  { label: "kcal", value: targets.calories },
                  { label: t("protein"), value: `${targets.protein_g} g` },
                  { label: t("sugar"), value: `${targets.sugar_g} g` },
                  { label: t("sodium"), value: `${targets.sodium_mg} mg` },
                  { label: t("fibre"), value: `${targets.fibre_g} g` },
                  { label: t("satFat"), value: `${targets.sat_fat_g} g` },
                ].map((row) => (
                  <li key={row.label} className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] text-ink-600">{row.label}</span>
                    <span className="font-data text-[14px] font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
              {active.conditions.length > 0 && (
                <p className="mt-4 flex items-start gap-2 rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[12px] text-ink-600">
                  <Icon name="info" size={13} className="mt-0.5 shrink-0 text-ink-400" />
                  {lang === "hi"
                    ? "आपकी स्वास्थ्य स्थितियों के कारण कुछ सीमाएं कड़ी की गई हैं।"
                    : "Some limits are tightened because of your health conditions."}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Settings ─────────────────────────────────────────── */}
        <section>
          <SectionHeading>{t("settings")}</SectionHeading>
          <div className="space-y-4 rounded-[18px] border border-ink-200 bg-surface p-5">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-600">{t("language")}</p>
              <div className="flex gap-2">
                {(["en", "hi"] as const).map((l) => (
                  <Chip
                    key={l}
                    label={l === "en" ? "English" : "हिंदी"}
                    selected={lang === l}
                    onClick={() => setLang(l)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-600">{t("theme")}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["light", "themeLight"],
                    ["dark", "themeDark"],
                    ["system", "themeSystem"],
                  ] as [ThemeChoice, string][]
                ).map(([value, key]) => (
                  <Chip
                    key={value}
                    label={t(key)}
                    selected={theme === value}
                    onClick={() => setTheme(value)}
                  />
                ))}
              </div>
            </div>

            {/* AI is opt-out, and the trade-off is stated in full rather
                than buried in a privacy policy. */}
            <div className="border-t border-ink-200 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-600">
                    {t("aiSection")}
                  </p>
                  <label
                    htmlFor="ai-toggle"
                    className="mt-1 block cursor-pointer text-[14px] font-medium"
                  >
                    {t("aiToggle")}
                  </label>
                </div>

                <button
                  id="ai-toggle"
                  type="button"
                  role="switch"
                  aria-checked={aiEnabled}
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`press relative h-[32px] w-[54px] shrink-0 rounded-full transition-colors ${
                    aiEnabled ? "bg-brand" : "bg-ink-200"
                  }`}
                >
                  <span className="sr-only">{t("aiToggle")}</span>
                  <span
                    className="absolute top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-sm transition-[left]"
                    style={{ left: aiEnabled ? 25 : 3 }}
                  />
                </button>
              </div>

              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-400">
                {t("aiPrivacy")}
              </p>

              {aiEnabled && aiOn === false && (
                <p className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-average-bg px-3.5 py-2.5 text-[12px] leading-relaxed text-average-ink">
                  <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                  {t("aiNotConfigured")}
                </p>
              )}
            </div>

            <Link
              href="/history"
              className="press -mx-2 flex min-h-[48px] items-center gap-3 rounded-[12px] px-2 hover:bg-surface-2"
            >
              <Icon name="history" size={18} className="shrink-0 text-ink-600" />
              <span className="flex-1 text-[14px] font-medium">{t("scanHistory")}</span>
              <span className="font-data text-[13px] text-ink-400">{history.length}</span>
              <Icon name="chevronRight" size={16} className="text-ink-400" />
            </Link>

            <button
              type="button"
              onClick={download}
              className="press -mx-2 flex min-h-[48px] w-full items-center gap-3 rounded-[12px] px-2 hover:bg-surface-2"
            >
              <Icon name="download" size={18} className="shrink-0 text-ink-600" />
              <span className="flex-1 text-left text-[14px] font-medium">{t("exportData")}</span>
              <Icon name="chevronRight" size={16} className="text-ink-400" />
            </button>

            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              className="press -mx-2 flex min-h-[48px] w-full items-center gap-3 rounded-[12px] px-2 text-avoid-ink hover:bg-avoid-bg"
            >
              <Icon name="trash" size={18} className="shrink-0" />
              <span className="flex-1 text-left text-[14px] font-medium">{t("deleteData")}</span>
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </section>

        <Disclaimer />
      </div>

      {editing && (
        <ProfileEditor
          profile={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            saveProfile(p);
            setEditing(null);
            setToast(t("profileSaved"));
          }}
          onDelete={
            profiles.some((p) => p.profile_id === editing.profile_id)
              ? () => {
                  removeProfile(editing.profile_id);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}

      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title={t("deleteData")}>
        <p className="mb-6 text-[14px] leading-relaxed text-ink-600">{t("deleteConfirm")}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmWipe(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            icon="trash"
            className="flex-1"
            onClick={() => {
              wipeAll();
              setConfirmWipe(false);
              setToast(lang === "hi" ? "सारा डेटा मिट गया" : "All data deleted");
            }}
          >
            {t("delete")}
          </Button>
        </div>
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Profile editor. Every field is optional and says so — this is the
   Sunita persona's screen as much as anyone's (spec §7.6).
   ───────────────────────────────────────────────────────────────── */
function ProfileEditor({
  profile,
  onClose,
  onSave,
  onDelete,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (p: UserProfile) => void;
  onDelete?: () => void;
}) {
  const { t, lang } = useStore();
  const [draft, setDraft] = useState<UserProfile>(profile);

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const bmi = bmiOf(draft);

  const ACTIVITIES: [ActivityLevel, string][] = [
    ["sedentary", "sedentary"], ["light", "light"], ["moderate", "moderate"],
    ["active", "active"], ["very_active", "veryActive"],
  ];
  const GOALS: [Goal, string][] = [
    ["maintain", "goalMaintain"], ["lose_weight", "goalLose"], ["gain_weight", "goalGain"],
    ["manage_blood_sugar", "goalSugar"], ["lower_bp", "goalBp"], ["build_muscle", "goalMuscle"],
  ];
  const DIETS: [DietPreference, string][] = [
    ["vegetarian", "vegetarian"], ["non_vegetarian", "nonVegetarian"], ["vegan", "vegan"],
    ["eggetarian", "eggetarian"], ["jain", "jain"],
  ];

  return (
    <Sheet open onClose={onClose} title={draft.name || t("profileTitle")}>
      <div className="space-y-6">
        {/* ── Basic ── */}
        <section className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("basic")} · {t("optional")}
          </p>

          <Field label={t("name")}>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder={lang === "hi" ? "आपका नाम" : "Your name"}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("age")}>
              <input
                value={draft.age ?? ""}
                onChange={(e) => set("age", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined)}
                inputMode="numeric"
                className={`${inputClass} font-data`}
              />
            </Field>
            <Field label={`${t("height")} (cm)`}>
              <input
                value={draft.height_cm ?? ""}
                onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined)}
                inputMode="numeric"
                className={`${inputClass} font-data`}
              />
            </Field>
            <Field label={`${t("weight")} (kg)`}>
              <input
                value={draft.weight_kg ?? ""}
                onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined)}
                inputMode="numeric"
                className={`${inputClass} font-data`}
              />
            </Field>
          </div>

          {bmi && (
            <p className="rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-600">
              {t("bmi")} <span className="font-data font-semibold text-ink-900">{bmi.value}</span>{" "}
              · {lang === "hi" ? bmi.band_hi : bmi.band_en}
            </p>
          )}

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-600">{t("sex")}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [["female", "female"], ["male", "male"], ["unspecified", "preferNot"]] as [Sex, string][]
              ).map(([value, key]) => (
                <Chip key={value} label={t(key)} selected={draft.sex === value} onClick={() => set("sex", value)} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-600">{t("activityLevel")}</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map(([value, key]) => (
                <Chip
                  key={value}
                  label={t(key)}
                  selected={draft.activity_level === value}
                  onClick={() => set("activity_level", value)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Conditions ── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("healthConditions")}
          </p>
          <p className="mb-2.5 mt-1 text-[12px] text-ink-400">{t("tapAnyApply")}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITION_META) as ConditionId[]).map((c) => (
              <Chip
                key={c}
                label={lang === "hi" ? CONDITION_META[c].label_hi : CONDITION_META[c].label_en}
                selected={draft.conditions.includes(c)}
                onClick={() => set("conditions", toggleIn(draft.conditions, c))}
              />
            ))}
          </div>
        </section>

        {/* ── Allergies ── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("allergies")}
          </p>
          <p className="mb-2.5 mt-1 text-[12px] text-ink-400">
            {lang === "hi"
              ? "चुनी गई एलर्जी हर स्कैन पर लाल चेतावनी दिखाएगी।"
              : "Anything selected here triggers a red alert on every scan."}
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ALLERGEN_META) as AllergenId[]).map((a) => (
              <Chip
                key={a}
                label={lang === "hi" ? ALLERGEN_META[a].label_hi : ALLERGEN_META[a].label_en}
                selected={draft.allergies.includes(a)}
                onClick={() => set("allergies", toggleIn(draft.allergies, a))}
              />
            ))}
          </div>
        </section>

        {/* ── Diet & goal ── */}
        <section>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("dietPreference")}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETS.map(([value, key]) => (
              <Chip
                key={value}
                label={t(key)}
                selected={draft.diet_preference === value}
                onClick={() =>
                  set("diet_preference", draft.diet_preference === value ? undefined : value)
                }
              />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("goal")}
          </p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(([value, key]) => (
              <Chip key={value} label={t(key)} selected={draft.goal === value} onClick={() => set("goal", value)} />
            ))}
          </div>
        </section>

        <div className="flex gap-3 pt-1">
          {onDelete && (
            <Button variant="danger" icon="trash" onClick={onDelete} ariaLabel={t("delete")}>
              {t("delete")}
            </Button>
          )}
          <Button icon="check" className="flex-1" onClick={() => onSave(draft)}>
            {t("saveProfile")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
