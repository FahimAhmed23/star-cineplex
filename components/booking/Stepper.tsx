"use client";

import { useT } from "@/lib/i18n";

/** "1 Showtime · 2 Seats · 3 Checkout" — a small stepper on every booking screen (§9). */
export function Stepper({ step, tone = "dark" }: { step: 1 | 2 | 3; tone?: "dark" | "light" }) {
  const light = tone === "light";
  const { t } = useT();
  const steps = [t("booking.stepShowtime"), t("booking.stepSeats"), t("booking.stepCheckout")];
  return (
    <ol className="flex items-center gap-2 text-[14px] md:gap-3" aria-label={t("booking.steps")}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "next";
        return (
          <li key={label} className="flex items-center gap-2 md:gap-3" aria-current={state === "current" ? "step" : undefined}>
            <span className={`flex items-center gap-2 ${state === "next" ? (light ? "text-ink/65" : "text-muted") : light ? "text-ink" : "text-white"}`}>
              <span
                className={`grid size-6 place-items-center rounded-pill font-mono text-[12px] tabular-nums ${
                  state === "current" ? "bg-purple text-white" : state === "done" ? (light ? "bg-ink/10 text-ink" : "bg-white/15 text-white") : light ? "border border-ink/20" : "border border-white/20"
                }`}
              >
                {n}
              </span>
              {/* phones: only the current step keeps its label */}
              <span className={state === "current" ? "" : "max-md:sr-only"}>{label}</span>
            </span>
            {n < 3 && <span aria-hidden className={`h-px w-4 md:w-8 ${light ? "bg-ink/15" : "bg-white/15"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
