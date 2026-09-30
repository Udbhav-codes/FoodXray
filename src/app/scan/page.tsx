"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { AppBar, Button, inputClass } from "@/components/UI";
import { SAMPLE_LABELS } from "@/lib/scan";
import { runScan } from "@/lib/scan";
import { useStore } from "@/lib/store";
import { pick } from "@/lib/i18n";

type Mode = "camera" | "type";
type Phase = "idle" | "starting" | "live" | "denied" | "working";

export default function ScanPage() {
  const router = useRouter();
  const { t, lang, profiles, activeProfileId, addScan } = useStore();

  const [mode, setMode] = useState<Mode>("camera");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Camera lifecycle ─────────────────────────────────────────── */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Rear camera, and a resolution high enough that 6pt label text survives.
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("live");
    } catch {
      // Denied, unavailable, or insecure context. Both fallbacks stay open.
      setPhase("denied");
    }
  }, []);

  // Spec §7.2: the Scan tab opens the camera immediately, no landing screen.
  useEffect(() => {
    if (mode === "camera" && phase === "idle") void startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => stopCamera, [stopCamera]);

  /* ── OCR ──────────────────────────────────────────────────────── */

  /** Grayscale + contrast stretch. Printed labels OCR far better this way. */
  const preprocess = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;

    let min = 255;
    let max = 0;
    const grey = new Uint8ClampedArray(d.length / 4);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      grey[p] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const v = ((grey[p] - min) / range) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
  };

  const readImage = useCallback(
    async (source: HTMLVideoElement | HTMLImageElement, w: number, h: number) => {
      setPhase("working");
      setProgress(0);
      setError(null);

      try {
        const canvas = document.createElement("canvas");
        // Cap the long edge: bigger is slower without being more accurate.
        const scale = Math.min(1, 1600 / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        preprocess(canvas);

        const { createWorker } = await import("tesseract.js");
        // Devanagari data is only fetched when the user is actually reading Hindi.
        const langs = lang === "hi" ? "eng+hin" : "eng";
        const worker = await createWorker(langs, 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
          },
        });

        const { data } = await worker.recognize(canvas);
        await worker.terminate();

        finish(data.text, "ocr", data.confidence);
      } catch {
        setPhase(mode === "camera" ? "live" : "idle");
        setError(
          pick(
            lang,
            "We couldn't read that image. Try again with more light, or type the label instead.",
            "हम यह तस्वीर पढ़ नहीं पाए। ज़्यादा रोशनी में दोबारा लें, या लेबल टाइप करें।"
          )
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, mode, profiles, activeProfileId]
  );

  const finish = (
    raw: string,
    method: "ocr" | "text" | "sample",
    confidence?: number
  ) => {
    const result = runScan({
      rawText: raw,
      captureMethod: method,
      profiles,
      activeProfileId,
      ocrConfidence: confidence,
    });

    if (result.ingredients.length === 0) {
      setPhase(mode === "camera" ? "live" : "idle");
      setError(t("noTextFound"));
      return;
    }

    stopCamera();
    addScan(result);
    router.push(`/result/${result.scan_id}`);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    void readImage(video, video.videoWidth, video.videoHeight);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      void readImage(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  /* ── Working state ────────────────────────────────────────────── */

  if (phase === "working") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-8 text-center">
        <span className="a-leaf text-leaf-600">
          <Icon name="leaf" size={52} />
        </span>
        <div>
          <p className="text-[18px] font-semibold">{t("analysing")}</p>
          <p className="mt-1 text-[14px] text-ink-600">{t("readingText")}</p>
        </div>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-leaf-600 transition-[width] duration-300"
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className="font-data text-[13px] text-ink-400">{progress}%</p>
      </div>
    );
  }

  /* ── Camera / type ────────────────────────────────────────────── */

  return (
    <div className="pad-nav min-h-dvh bg-paper">
      <AppBar
        title={t("scanTitle")}
        right={
          <div className="flex rounded-full bg-surface-2 p-1">
            {(["camera", "type"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (m === "type") stopCamera();
                  setPhase("idle");
                  setError(null);
                  setMode(m);
                }}
                className={`press flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ${
                  mode === m ? "bg-surface text-leaf-700 shadow-sm" : "text-ink-600"
                }`}
              >
                <Icon name={m === "camera" ? "camera" : "keyboard"} size={16} />
                {m === "camera" ? t("useCamera") : t("typeInstead")}
              </button>
            ))}
          </div>
        }
      />

      <div className="shell pt-4">
        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-[14px] border border-avoid/30 bg-avoid-bg px-4 py-3 text-[13px] text-avoid-ink"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {mode === "camera" ? (
          <>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-leaf-900">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {phase === "live" && (
                <>
                  {/* Framing guide — the single biggest lever on OCR accuracy. */}
                  <div className="pointer-events-none absolute inset-0 grid place-items-center p-7">
                    <div className="relative h-[58%] w-full rounded-[18px] ring-2 ring-white/85">
                      {(
                        [
                          "left-0 top-0 border-l-4 border-t-4 rounded-tl-[18px]",
                          "right-0 top-0 border-r-4 border-t-4 rounded-tr-[18px]",
                          "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-[18px]",
                          "right-0 bottom-0 border-r-4 border-b-4 rounded-br-[18px]",
                        ] as const
                      ).map((cls) => (
                        <span
                          key={cls}
                          className={`absolute h-8 w-8 border-leaf-400 ${cls}`}
                        />
                      ))}
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] font-medium text-white/90">
                        {t("frameHint")}
                      </span>
                    </div>
                  </div>
                  <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[12px] text-white/75">
                    {t("tipSteady")}
                  </p>
                </>
              )}

              {phase === "starting" && (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="a-pulse text-white/70">
                    <Icon name="camera" size={40} />
                  </span>
                </div>
              )}

              {phase === "denied" && (
                <div className="absolute inset-0 grid place-items-center px-8 text-center">
                  <div>
                    <Icon name="camera" size={36} className="mx-auto mb-3 text-white/60" />
                    <p className="text-[14px] leading-relaxed text-white/85">
                      {t("cameraDenied")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Shutter row. Gallery and capture are always available; capture
                is disabled rather than hidden when there is no live stream. */}
            <div className="mt-5 flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="press flex min-h-[64px] w-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl text-ink-600 hover:bg-surface-2"
              >
                <Icon name="image" size={24} />
                <span className="text-[11px] font-medium">{t("uploadPhoto")}</span>
              </button>

              <button
                type="button"
                onClick={capture}
                disabled={phase !== "live"}
                aria-label={t("capture")}
                className="press grid h-[74px] w-[74px] place-items-center rounded-full bg-brand text-on-brand shadow-md ring-4 ring-leaf-200 disabled:bg-ink-200 disabled:text-ink-400 disabled:ring-surface-3"
              >
                <Icon name="camera" size={30} />
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode("type");
                  setPhase("idle");
                }}
                className="press flex min-h-[64px] w-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl text-ink-600 hover:bg-surface-2"
              >
                <Icon name="keyboard" size={24} />
                <span className="text-[11px] font-medium">{t("typeInstead")}</span>
              </button>
            </div>

            {phase === "denied" && (
              <div className="mt-5">
                <Button icon="camera" variant="secondary" full onClick={() => void startCamera()}>
                  {t("useCamera")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-[14px] text-ink-600">{t("pasteHint")}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder="INGREDIENTS: Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil (Palmolein)…"
              className={`${inputClass} resize-y py-3.5 leading-relaxed`}
            />
            <div className="mt-4">
              <Button
                icon="scan"
                full
                disabled={text.trim().length < 12}
                onClick={() => finish(text, "text")}
              >
                {t("analyse")}
              </Button>
            </div>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="sr-only"
        />

        {/* Worked examples, so the payoff is visible before the first scan. */}
        <section className="mt-8">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-400">
            {t("trySample")}
          </p>
          <ul className="grid grid-cols-2 gap-2.5">
            {SAMPLE_LABELS.map((sample) => (
              <li key={sample.id}>
                <button
                  type="button"
                  onClick={() => finish(sample.text, "sample")}
                  className="press flex min-h-[52px] w-full items-center gap-2.5 rounded-[14px] border border-ink-200 bg-surface px-3.5 text-left text-[13px] font-medium hover:bg-surface-2"
                >
                  <Icon name="sparkle" size={16} className="shrink-0 text-leaf-600" />
                  {pick(lang, sample.name, sample.name_hi)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
