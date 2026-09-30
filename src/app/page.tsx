"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/Icon";
import { AiBadge } from "@/components/AiBits";
import { useAiTip } from "@/lib/ai";
import { GradePill } from "@/components/Verdict";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/UI";
import { tipOfTheDay } from "@/data/tips";
import { pick } from "@/lib/i18n";
import { useStore, todayKey } from "@/lib/store";
import { computeTargets } from "@/lib/targets";

export default function HomePage() {
  const {
    t, lang, setLang, ready, activeProfile, profiles, history, logFor, aiEnabled,
  } = useStore();

  const staticTip = useMemo(() => tipOfTheDay(), []);
  // A tip written for what this household actually scans, falling back to the
  // fixed rotation whenever AI is off or unreachable.
  const tip = useAiTip(
    pick(lang, staticTip.en, staticTip.hi),
    useMemo(
      () =>
        history.slice(0, 5).map((h) => ({
          name: h.product_name,
          grade: h.grade,
          category: h.product_category,
        })),
      [history]
    ),
    activeProfile,
    lang,
    aiEnabled
  );

  const targets = computeTargets(activeProfile);
  const today = logFor(todayKey());
  const kcal = today.entries.reduce((s, e) => s + (e.nutrition.calories ?? 0), 0);
  const kcalPct = Math.min(100, Math.round((kcal / targets.calories) * 100));

  const profileIncomplete =
    !activeProfile || !activeProfile.age || !activeProfile.weight_kg;

  if (!ready) return <div className="min-h-dvh bg-paper" />;

  return (
    <div className="pad-nav">
      {/* ── Zone A · Greeting ────────────────────────────────────── */}
      <header className="shell safe-top pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] text-ink-600">
              {t("greetingNoName")}
              {activeProfile?.name ? `, ${activeProfile.name}` : ""}
            </p>
            <h1 className="mt-0.5 text-[26px] font-semibold leading-tight">
              {t("homePrompt")}
            </h1>
          </div>

          {/* Language toggle pinned top-right, always reachable (spec §7.1). */}
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="press flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3.5 text-[13px] font-semibold text-ink-900 hover:bg-surface-2"
            aria-label={
              lang === "en" ? "Switch to Hindi · हिंदी में बदलें" : "Switch to English"
            }
          >
            <Icon name="globe" size={17} className="text-leaf-600" />
            <span className={lang === "en" ? "text-leaf-700" : "text-ink-400"}>EN</span>
            <span className="text-ink-200">|</span>
            <span className={lang === "hi" ? "text-leaf-700" : "text-ink-400"}>हिं</span>
          </button>
        </div>

        {profileIncomplete && (
          <Link
            href="/profile"
            className="press mt-4 flex items-center gap-3 rounded-[14px] border border-haldi-500/35 bg-haldi-50 px-4 py-3 text-[13px] font-medium text-haldi-600"
          >
            <Icon name="sparkle" size={17} className="shrink-0" />
            <span className="flex-1">{t("completeProfile")}</span>
            <Icon name="chevronRight" size={16} className="shrink-0" />
          </Link>
        )}
      </header>

      {/* ── Zone B · Primary scan card (the hero) ────────────────── */}
      <section className="shell mt-5">
        <Link
          href="/scan"
          className="press group relative block overflow-hidden rounded-[28px] bg-brand px-6 py-9 text-center shadow-md"
        >
          {/* Kitchen-garden texture, kept faint so text contrast is untouched. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, #fff 1.4px, transparent 1.6px), radial-gradient(circle at 72% 68%, #fff 1.4px, transparent 1.6px)",
              backgroundSize: "34px 34px, 46px 46px",
            }}
          />
          <span className="relative mx-auto mb-4 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-white/15 ring-1 ring-white/25">
            <Icon name="camera" size={34} className="text-on-brand" />
            {/* The scanning line — motion that means something. */}
            <span
              aria-hidden="true"
              className="a-scanline absolute h-[2px] w-[52px] rounded-full bg-white/85"
            />
          </span>
          <span className="relative block text-[21px] font-semibold text-on-brand">
            {t("scanCardTitle")}
          </span>
          <span className="relative mt-1.5 block text-[13px] text-on-brand/90">
            {t("scanCardHint")}
          </span>
        </Link>
      </section>

      {/* ── Zone C · Find Alternatives ───────────────────────────── */}
      <section className="shell mt-3.5">
        <Link
          href="/alternatives"
          className="press flex min-h-[62px] items-center gap-3.5 rounded-[20px] border border-ink-200 bg-surface px-5 shadow-sm hover:bg-surface-2"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-600">
            <Icon name="swap" size={20} />
          </span>
          <span className="flex-1 text-[15px] font-semibold">{t("findAlternatives")}</span>
          <Icon name="chevronRight" size={18} className="shrink-0 text-ink-400" />
        </Link>
      </section>

      {/* ── Zone D · Diet planner entry ──────────────────────────── */}
      <section className="shell mt-3.5">
        <Link
          href="/plan"
          className="press block rounded-[20px] border border-ink-200 bg-surface p-5 shadow-sm hover:bg-surface-2"
        >
          <div className="flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-600">
              <Icon name="plan" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{t("yourDietPlan")}</p>
              <p className="mt-0.5 font-data text-[13px] text-ink-600">
                {Math.round(kcal).toLocaleString()} / {targets.calories.toLocaleString()} kcal
              </p>
            </div>
            <span className="font-data text-[15px] font-semibold text-leaf-700">
              {kcalPct}%
            </span>
          </div>
          <div className="mt-3.5">
            <ProgressBar value={kcal} max={targets.calories} />
          </div>
        </Link>
      </section>

      {/* ── Zone E · Recent scans ────────────────────────────────── */}
      <section className="mt-7">
        <div className="shell">
          <SectionHeading
            action={
              history.length > 0 ? (
                <Link
                  href="/history"
                  className="text-[13px] font-semibold text-leaf-700 hover:underline"
                >
                  {t("seeAll")} →
                </Link>
              ) : undefined
            }
          >
            {t("recentScans")}
          </SectionHeading>
        </div>

        {history.length === 0 ? (
          <div className="shell">
            <EmptyState icon="leaf" text={t("noScansYet")} />
          </div>
        ) : (
          <ul className="shell no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {history.slice(0, 10).map((scan) => (
              <li key={scan.scan_id} className="shrink-0">
                <Link
                  href={`/result/${scan.scan_id}`}
                  className="press flex h-[104px] w-[128px] flex-col justify-between rounded-[18px] border border-ink-200 bg-surface p-3.5 shadow-sm hover:bg-surface-2"
                >
                  <GradePill grade={scan.grade} />
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug">
                    {scan.product_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Zone F · Tip of the day ──────────────────────────────── */}
      <section className="shell mt-7">
        <div className="rounded-[20px] border border-haldi-500/25 bg-haldi-50 p-5">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-haldi-600">
            <Icon name="bulb" size={17} />
            {t("didYouKnow")}
            {tip.isAi && <AiBadge />}
          </p>
          <p className="text-[14px] leading-relaxed text-ink-900">{tip.text}</p>
        </div>
      </section>

      {/* Family switcher hint — the "one scan, four verdicts" promise. */}
      {profiles.length > 1 && (
        <section className="shell mt-4">
          <div className="flex items-center gap-3 rounded-[16px] bg-leaf-50 px-4 py-3">
            <Icon name="users" size={18} className="shrink-0 text-leaf-600" />
            <p className="text-[13px] text-leaf-700">
              {lang === "hi"
                ? `${profiles.length} लोगों की प्रोफ़ाइल सेव है — हर स्कैन पर सबका अलग नतीजा मिलेगा।`
                : `${profiles.length} profiles saved — every scan shows a separate verdict for each person.`}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
