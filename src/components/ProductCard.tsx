"use client";

import { Icon } from "@/components/Icon";
import { GradePill } from "@/components/Verdict";
import { pick } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

/* An alternative product. Availability language is deliberately careful:
   without a retailer API we do not know what is on a shelf right now, so
   we say "commonly available" and never "in stock" (spec §12.4). */

export function ProductCard({
  product,
  distanceKm,
}: {
  product: Product;
  distanceKm?: number;
}) {
  const { t, lang } = useStore();
  const benefits = pick(lang, product.benefits_en, product.benefits_hi);

  return (
    <li className="rounded-[18px] border border-ink-200 bg-surface p-4">
      <div className="flex items-start gap-3.5">
        <GradePill grade={product.grade} className="mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">
            {pick(lang, product.name_en, product.name_hi)}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-400">{product.brand}</p>

          <ul className="mt-2 flex flex-wrap gap-1.5">
            {benefits.slice(0, 3).map((b) => (
              <li
                key={b}
                className="rounded-full bg-good-bg px-2.5 py-1 text-[11.5px] font-medium text-good-ink"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>

        <span className="shrink-0 text-right">
          <span className="block font-data text-[17px] font-semibold text-leaf-700">
            {product.score}
          </span>
          <span className="block text-[10px] text-ink-400">/100</span>
        </span>
      </div>

      <p className="mt-3 flex items-center gap-1.5 border-t border-ink-200 pt-2.5 text-[12px] text-ink-600">
        <Icon name="pin" size={13} className="shrink-0 text-ink-400" />
        {product.availability.typical_retail
          ? t("commonlyAvailable")
          : lang === "hi"
            ? "मुख्यतः ऑनलाइन"
            : "Mostly online"}
        {typeof distanceKm === "number" && (
          <span className="font-data">
            {" · "}
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} km`}
          </span>
        )}
      </p>
    </li>
  );
}
