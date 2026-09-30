"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { useStore } from "@/lib/store";

/* Shared primitives. Every interactive element here meets the 48dp touch
   minimum and gives pressed feedback that does not shift layout bounds. */

export function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  full,
  type = "button",
  disabled,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  full?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const styles = {
    primary:
      "bg-brand text-on-brand shadow-sm hover:bg-brand-hover disabled:bg-ink-200 disabled:text-ink-400",
    secondary:
      "bg-surface text-ink-900 border border-ink-200 hover:bg-surface-2 disabled:text-ink-400",
    ghost: "text-ink-600 hover:bg-surface-2 hover:text-ink-900",
    danger: "bg-avoid-bg text-avoid-ink border border-avoid/30 hover:bg-avoid/15",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`press inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold ${styles} ${
        full ? "w-full" : ""
      } ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}

export function AppBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const { t } = useStore();
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-paper/92 backdrop-blur-lg">
      <div className="shell safe-top flex min-h-[60px] items-center gap-2 py-2">
        {onBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="press -ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-900 hover:bg-surface-2"
          >
            <Icon name="arrowLeft" size={22} title={t("back")} />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[19px] font-semibold">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function SectionHeading({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
        {children}
        {count != null && (
          <span className="ml-2 font-data font-semibold text-ink-600">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}

/** Bottom sheet — spring up, grab handle, focus trapped, Escape closes. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { t } = useStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the sheet so screen readers follow the visual change.
    requestAnimationFrame(() => ref.current?.querySelector("button")?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "var(--scrim)" }}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="a-sheet relative max-h-[88dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-surface shadow-xl md:max-w-[600px]"
      >
        <div className="sticky top-0 z-10 rounded-t-[28px] bg-surface px-5 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-ink-200" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-[18px] font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="press grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-surface-2"
            >
              <Icon name="close" size={20} title={t("close")} />
            </button>
          </div>
        </div>
        <div className="px-5 pb-8 safe-bottom">{children}</div>
      </div>
    </div>
  );
}

/** Empty states are invitations to act, never dead ends (spec §14.10). */
export function EmptyState({
  icon = "leaf",
  text,
  action,
}: {
  icon?: IconName;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[20px] border border-dashed border-ink-200 px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-leaf-50 text-leaf-600">
        <Icon name={icon} size={26} />
      </span>
      <p className="max-w-[34ch] text-sm text-ink-600">{text}</p>
      {action}
    </div>
  );
}

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
        selected
          ? "border-leaf-600 bg-leaf-50 text-leaf-700"
          : "border-ink-200 bg-surface text-ink-600 hover:border-ink-400 hover:text-ink-900"
      }`}
    >
      {selected && <Icon name="check" size={14} strokeWidth={3} />}
      {label}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {/* Visible label, never placeholder-only (spec §8 forms rules). */}
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full min-h-[52px] rounded-[14px] border border-ink-200 bg-surface-2 px-4 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-leaf-600 focus:bg-surface outline-none transition-colors";

/** A toast that announces itself politely rather than stealing focus. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="a-rise pointer-events-none fixed inset-x-0 bottom-[104px] z-50 flex justify-center px-4"
    >
      <span className="rounded-full bg-leaf-900 px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-surface-3 dark:text-ink-900">
        {message}
      </span>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "leaf",
}: {
  value: number;
  max: number;
  tone?: "leaf" | "warning" | "danger";
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const over = value > max;
  const bg = over
    ? "bg-avoid"
    : tone === "warning"
      ? "bg-average"
      : tone === "danger"
        ? "bg-avoid"
        : "bg-leaf-600";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className={`h-full rounded-full ${bg} transition-[width] duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** The medical disclaimer, mandatory on every result (spec §18.2). */
export function Disclaimer() {
  const { t } = useStore();
  return (
    <p className="flex items-start gap-2.5 rounded-[14px] bg-surface-2 px-4 py-3 text-[12px] leading-relaxed text-ink-600">
      <Icon name="info" size={15} className="mt-0.5 shrink-0 text-ink-400" />
      <span>{t("disclaimer")}</span>
    </p>
  );
}
