"use client";

import { Icon, type IconName } from "@/components/Icon";
import { useStore } from "@/lib/store";
import type { Grade, RibbonCounts, Verdict } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════════
   Verdict primitives. Colour NEVER carries meaning on its own — every
   verdict pairs a hue with an icon and a word, because roughly 8% of
   Indian men have some colour-vision deficiency (spec §14.6).
   ═══════════════════════════════════════════════════════════════════ */

export const VERDICT_STYLE: Record<
  Verdict,
  { fg: string; bg: string; solid: string; icon: IconName; key: string }
> = {
  good: {
    fg: "text-good-ink",
    bg: "bg-good-bg",
    solid: "bg-good",
    icon: "check",
    key: "verdictGood",
  },
  average: {
    fg: "text-average-ink",
    bg: "bg-average-bg",
    solid: "bg-average",
    icon: "alert",
    key: "verdictAverage",
  },
  avoid: {
    fg: "text-avoid-ink",
    bg: "bg-avoid-bg",
    solid: "bg-avoid",
    icon: "close",
    key: "verdictAvoid",
  },
  unknown: {
    fg: "text-unknown-ink",
    bg: "bg-unknown-bg",
    solid: "bg-unknown",
    icon: "info",
    key: "verdictUnknown",
  },
};

export function VerdictChip({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const { t } = useStore();
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${s.bg} ${s.fg} ${
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <Icon name={s.icon} size={size === "sm" ? 12 : 14} strokeWidth={2.6} />
      {t(s.key)}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   THE INGREDIENT RIBBON ⭐ — the signature element (spec §14.5).
   One horizontal stacked bar showing the proportion of good / average /
   avoid, readable in under half a second, before any text is processed.
   Texture is layered onto the avoid segment so the meaning survives
   greyscale and colour-blindness.
   ───────────────────────────────────────────────────────────────────── */

const RIBBON_ORDER: Verdict[] = ["good", "average", "avoid", "unknown"];

export function IngredientRibbon({
  counts,
  onJump,
  animate = true,
}: {
  counts: RibbonCounts;
  onJump?: (v: Verdict) => void;
  animate?: boolean;
}) {
  const { t } = useStore();
  const total = RIBBON_ORDER.reduce((s, k) => s + counts[k], 0);
  if (!total) return null;

  const summary = RIBBON_ORDER.filter((v) => counts[v] > 0)
    .map((v) => `${counts[v]} ${t(VERDICT_STYLE[v].key).toLowerCase()}`)
    .join(", ");

  return (
    <figure className="w-full">
      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`Ingredient breakdown: ${summary}`}
      >
        {RIBBON_ORDER.map((v, i) => {
          const n = counts[v];
          if (!n) return null;
          const pct = (n / total) * 100;
          const seg = (
            <span
              className={`block h-full ${VERDICT_STYLE[v].solid} ${
                v === "avoid" ? "hatch" : v === "average" ? "dot-tex" : ""
              } ${animate ? "a-grow-x" : ""}`}
              style={animate ? { animationDelay: `${i * 60}ms` } : undefined}
            />
          );
          return onJump ? (
            <button
              key={v}
              type="button"
              onClick={() => onJump(v)}
              style={{ width: `${pct}%` }}
              className="h-full cursor-pointer transition-opacity hover:opacity-85"
              aria-label={`Jump to first ${t(VERDICT_STYLE[v].key).toLowerCase()} ingredient`}
            >
              {seg}
            </button>
          ) : (
            <span key={v} style={{ width: `${pct}%` }} className="h-full">
              {seg}
            </span>
          );
        })}
      </div>

      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {RIBBON_ORDER.filter((v) => counts[v] > 0).map((v) => (
          <span key={v} className="flex items-center gap-1.5 text-xs text-ink-600">
            <span
              className={`h-2.5 w-2.5 rounded-full ${VERDICT_STYLE[v].solid} ${
                v === "avoid" ? "hatch" : ""
              }`}
            />
            <span className="font-data font-semibold text-ink-900">{counts[v]}</span>
            {t(
              v === "good" ? "good" : v === "average" ? "average" : v === "avoid" ? "avoid" : "unclear"
            )}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SCORE BADGE — a leaf silhouette holding the numeral, with a ring that
   fills clockwise on reveal (spec §14.6).
   ───────────────────────────────────────────────────────────────────── */

const GRADE_TONE: Record<Grade, { stroke: string; text: string; fill: string }> = {
  A: { stroke: "var(--verdict-good)", text: "text-good-ink", fill: "var(--verdict-good-bg)" },
  B: { stroke: "var(--leaf-400)", text: "text-good-ink", fill: "var(--verdict-good-bg)" },
  C: { stroke: "var(--verdict-average)", text: "text-average-ink", fill: "var(--verdict-average-bg)" },
  D: { stroke: "var(--haldi-500)", text: "text-average-ink", fill: "var(--verdict-average-bg)" },
  E: { stroke: "var(--verdict-avoid)", text: "text-avoid-ink", fill: "var(--verdict-avoid-bg)" },
};

export function ScoreBadge({
  score,
  grade,
  size = 148,
}: {
  score: number;
  grade: Grade;
  size?: number;
}) {
  const tone = GRADE_TONE[grade];
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill={tone.fill} stroke="var(--ink-200)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="6"
          // A round cap on a zero-length dash paints a stray dot at 12 o'clock.
          strokeLinecap={score > 0 ? "round" : "butt"}
          strokeDasharray={`${filled} ${circumference}`}
          style={{
            transition: "stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>

      {/* Leaf mark — quiet brand signature behind the numeral. */}
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute opacity-[0.09]"
        style={{ width: size * 0.52, height: size * 0.52, color: tone.stroke }}
        aria-hidden="true"
      >
        <path
          d="M4 20c0-8 5-14 16-15 0 11-5.5 16-11 16-2 0-5-1-5-1Z"
          fill="currentColor"
        />
      </svg>

      <div className="relative flex flex-col items-center leading-none">
        <span className={`font-data text-[2.6rem] font-semibold ${tone.text}`}>
          {score}
        </span>
        <span className="mt-1 text-[11px] font-medium text-ink-400">/ 100</span>
      </div>
    </div>
  );
}

export function GradePill({ grade, className = "" }: { grade: Grade; className?: string }) {
  const tone = GRADE_TONE[grade];
  return (
    <span
      className={`inline-grid h-7 w-7 place-items-center rounded-lg font-data text-sm font-bold ${tone.text} ${className}`}
      style={{ background: tone.fill, boxShadow: `inset 0 0 0 1.5px ${tone.stroke}` }}
    >
      {grade}
    </span>
  );
}
