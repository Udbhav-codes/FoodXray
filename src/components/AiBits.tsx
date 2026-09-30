"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Button, inputClass, SectionHeading } from "@/components/UI";
import { pick } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { AiAlternative, AiSource, AiState } from "@/lib/ai";

/* UI for the Gemini-backed surfaces. Every one of these is additive: if AI
   is off or fails, the caller keeps rendering its deterministic content and
   these simply do not appear. */

/** Marks text as machine-written, so it is never mistaken for a fixed rule. */
export function AiBadge({ label }: { label?: string }) {
  const { t } = useStore();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf-700">
      <Icon name="sparkle" size={10} strokeWidth={2.6} />
      {label ?? t("aiBadge")}
    </span>
  );
}

/** Three shimmer lines, sized like the text they stand in for. */
export function AiSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="a-pulse h-3 rounded-full bg-surface-3"
          style={{ width: `${100 - i * 14}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

/* ───────────────────── Live alternatives ───────────────────── */

const AVAILABILITY_KEY: Record<AiAlternative["availability"], string> = {
  widely_sold: "widelySold",
  online: "onlineMostly",
  niche: "nicheProduct",
};

export function AiAlternativeCard({ item }: { item: AiAlternative }) {
  const { t, lang } = useStore();
  const benefits = pick(lang, item.benefits_en, item.benefits_hi);

  return (
    <li className="rounded-[18px] border border-ink-200 bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-600">
          <Icon name="leaf" size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">{item.name}</p>
          <p className="mt-0.5 text-[12px] text-ink-400">{item.brand}</p>

          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            {pick(lang, item.why_en, item.why_hi)}
          </p>

          {benefits.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="rounded-full bg-good-bg px-2.5 py-1 text-[11.5px] font-medium text-good-ink"
                >
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink-200 pt-2.5 text-[12px] text-ink-600">
        <Icon name="pin" size={13} className="shrink-0 text-ink-400" />
        {t(AVAILABILITY_KEY[item.availability])}
        {item.approx_price_inr && (
          <span className="font-data text-ink-400">· {item.approx_price_inr}</span>
        )}
      </p>
    </li>
  );
}

export function AiSources({ sources }: { sources: AiSource[] }) {
  const { t } = useStore();
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press inline-flex min-h-[36px] items-center gap-1.5 text-[12px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <Icon name="info" size={13} />
        {t("sources")} ({sources.length})
        <Icon
          name="chevronDown"
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="a-fade mt-2 space-y-1.5">
          {sources.map((s) => (
            <li key={s.uri}>
              <a
                href={s.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[12px] text-leaf-700 underline underline-offset-2 hover:text-leaf-600"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Ask panel ───────────────────────── */

export function AskPanel({
  answer,
  state,
  onAsk,
  onReset,
}: {
  answer: string | null;
  state: AiState;
  onAsk: (q: string) => void;
  onReset: () => void;
}) {
  const { t, lang } = useStore();
  const [question, setQuestion] = useState("");

  const suggestions = pick(
    lang,
    ["Is this okay for my kids?", "How much can I eat in a day?", "What's the worst thing in it?"],
    ["क्या यह बच्चों के लिए ठीक है?", "दिन में कितना खा सकते हैं?", "इसमें सबसे खराब क्या है?"]
  );

  const submit = (q: string) => {
    const text = q.trim();
    if (text.length < 3) return;
    setQuestion(text);
    onAsk(text);
  };

  return (
    <section className="rounded-[20px] border border-ink-200 bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="sparkle" size={17} className="text-leaf-600" />
        <h2 className="text-[15px] font-semibold">{t("askTitle")}</h2>
      </div>

      {answer && state === "done" ? (
        <>
          <p className="mb-2 text-[13px] font-medium text-ink-400">{question}</p>
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-900">
            {answer}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              icon="plus"
              onClick={() => {
                setQuestion("");
                onReset();
              }}
            >
              {t("askAnother")}
            </Button>
          </div>
        </>
      ) : state === "loading" ? (
        <>
          <p className="mb-3 flex items-center gap-2 text-[13px] text-ink-600">
            <span className="a-leaf inline-flex text-leaf-600">
              <Icon name="leaf" size={15} />
            </span>
            {t("askThinking")}
          </p>
          <AiSkeleton lines={2} />
        </>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(question);
            }}
            className="flex gap-2"
          >
            <label className="sr-only" htmlFor="ask-input">
              {t("askTitle")}
            </label>
            <input
              id="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("askPlaceholder")}
              maxLength={300}
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit"
              disabled={question.trim().length < 3}
              className="press grid min-h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-brand text-on-brand disabled:bg-ink-200 disabled:text-ink-400"
            >
              <Icon name="chevronRight" size={20} title={t("askButton")} />
            </button>
          </form>

          {state === "unavailable" && (
            <p role="alert" className="mt-2.5 text-[12px] text-avoid-ink">
              {t("askFailed")}
            </p>
          )}

          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => submit(s)}
                  className="press rounded-full border border-ink-200 px-3 py-1.5 text-[12px] text-ink-600 hover:border-leaf-600 hover:text-leaf-700"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 flex items-start gap-2 border-t border-ink-200 pt-3 text-[11.5px] leading-relaxed text-ink-400">
        <Icon name="info" size={13} className="mt-0.5 shrink-0" />
        {t("disclaimer")}
      </p>
    </section>
  );
}

/** Heading for an AI section, with state shown honestly rather than hidden. */
export function AiSectionHeading({
  titleKey,
  state,
  onRetry,
}: {
  titleKey: string;
  state: AiState;
  onRetry?: () => void;
}) {
  const { t } = useStore();
  return (
    <SectionHeading
      action={
        state === "done" && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="press inline-flex items-center gap-1 text-[13px] font-semibold text-leaf-700 hover:underline"
          >
            <Icon name="swap" size={13} />
            {t("refresh")}
          </button>
        ) : undefined
      }
    >
      <span className="inline-flex items-center gap-2">
        {t(titleKey)}
        <AiBadge />
      </span>
    </SectionHeading>
  );
}
