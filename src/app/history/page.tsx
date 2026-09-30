"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { GradePill, IngredientRibbon } from "@/components/Verdict";
import { AppBar, Button, EmptyState } from "@/components/UI";
import { useStore } from "@/lib/store";

export default function HistoryPage() {
  const { t, lang, ready, history, removeScan } = useStore();

  if (!ready) return <div className="min-h-dvh bg-paper" />;

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar title={t("scanHistory")} onBack />

      <div className="shell pt-4">
        {history.length === 0 ? (
          <EmptyState
            icon="leaf"
            text={t("noScansYet")}
            action={
              <Link href="/scan">
                <Button icon="camera">{t("scanCardTitle")}</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {history.map((scan) => (
              <li
                key={scan.scan_id}
                className="rounded-[18px] border border-ink-200 bg-surface"
              >
                <div className="flex items-start gap-3 p-4">
                  <Link
                    href={`/result/${scan.scan_id}`}
                    className="press flex min-w-0 flex-1 items-start gap-3"
                  >
                    <GradePill grade={scan.grade} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {scan.product_name}
                      </span>
                      <span className="mt-0.5 block font-data text-[12px] text-ink-600">
                        {scan.score}/100 ·{" "}
                        {new Date(scan.timestamp).toLocaleDateString(
                          lang === "hi" ? "hi-IN" : "en-IN",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => removeScan(scan.scan_id)}
                    className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-avoid-bg hover:text-avoid-ink"
                  >
                    <Icon
                      name="trash"
                      size={17}
                      title={`${t("remove")} ${scan.product_name}`}
                    />
                  </button>
                </div>

                <div className="px-4 pb-4">
                  <IngredientRibbon counts={scan.ribbon} animate={false} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
