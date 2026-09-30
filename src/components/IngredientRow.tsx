"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { VERDICT_STYLE, VerdictChip } from "@/components/Verdict";
import { pick } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { ResolvedIngredient } from "@/lib/types";

/* One ingredient row (spec §7.3 C). Collapsed it gives a colour, a name and
   a one-line summary. Expanded it answers the four questions the user
   actually has: what is it called, what is it really, is it good, and does
   it matter for me. */

export function IngredientRow({
  item,
  index,
}: {
  item: ResolvedIngredient;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const { t, lang } = useStore();
  const style = VERDICT_STYLE[item.verdict];
  const ing = item.ingredient;

  const title = ing ? pick(lang, ing.name_en, ing.name_hi) : item.raw;
  const summary = ing
    ? pick(lang, ing.reason_en, ing.reason_hi)
    : t("couldNotIdentify");

  return (
    <li
      id={`ing-${index}`}
      className="relative overflow-hidden rounded-[16px] border border-ink-200 bg-surface"
    >
      {/* 4px coloured stem carrying the verdict. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${style.solid} ${
          item.verdict === "avoid" ? "hatch" : ""
        }`}
      />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex w-full items-start gap-3 py-3.5 pl-5 pr-3.5 text-left hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold leading-snug">{title}</span>
            {ing?.code && (
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-data text-[11px] font-semibold text-ink-600">
                {ing.code}
              </span>
            )}
            {item.allergenHit && (
              <span className="rounded-full bg-avoid px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {lang === "hi" ? "एलर्जी" : "Allergy"}
              </span>
            )}
          </span>

          {/* Show the printed text too, when we renamed it — the user has to
              match what is actually on the pack (spec §16.3). */}
          {ing && item.raw.toLowerCase() !== title.toLowerCase() && (
            <span className="mt-0.5 block truncate text-[12px] text-ink-400">
              {lang === "hi" ? "पैकेट पर: " : "On pack: "}
              {item.raw}
            </span>
          )}

          <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">
            {summary}
          </span>

          {item.personalNote_en && (
            <span
              className={`mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium ${style.bg} ${style.fg}`}
            >
              <Icon name="profile" size={13} className="mt-0.5 shrink-0" />
              {pick(lang, item.personalNote_en, item.personalNote_hi ?? "")}
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <VerdictChip verdict={item.verdict} size="sm" />
          <Icon
            name="chevronDown"
            size={18}
            className={`text-ink-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="a-fade space-y-3.5 border-t border-ink-200 bg-surface-2/60 px-5 py-4">
          {ing ? (
            <>
              {(ing.scientific || ing.code) && (
                <Detail label={t("scientificName")}>
                  <span className="font-data text-[13px]">
                    {ing.scientific ?? ing.code}
                  </span>
                  {lang === "hi" && (
                    <span className="mt-0.5 block text-[13px] text-ink-600">
                      {ing.name_hi}
                    </span>
                  )}
                </Detail>
              )}

              <Detail label={t("whatItIs")}>
                {pick(lang, ing.what_en, ing.what_hi)}
              </Detail>

              <Detail label={t("isItGood")}>
                <span className="mb-1.5 flex">
                  <VerdictChip verdict={ing.verdict} size="sm" />
                </span>
                {pick(lang, ing.reason_en, ing.reason_hi)}
              </Detail>

              {item.confidence < 1 && item.confidence > 0 && (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
                  <Icon name="info" size={13} />
                  {lang === "hi"
                    ? `मिलान भरोसा ${Math.round(item.confidence * 100)}% — पैकेट से मिलाकर देखें।`
                    : `Matched with ${Math.round(item.confidence * 100)}% confidence — check against the pack.`}
                </p>
              )}
            </>
          ) : (
            /* Honesty rule (spec §9): we say we don't know rather than guess. */
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-600">
              <Icon name="info" size={15} className="mt-0.5 shrink-0 text-ink-400" />
              {t("couldNotIdentify")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
        {label}
      </p>
      <div className="text-[13.5px] leading-relaxed text-ink-900">{children}</div>
    </div>
  );
}
