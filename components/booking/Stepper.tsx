"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";

/** "1 Showtime · 2 Seats · 3 Checkout" — a small stepper on every booking screen (§9). */
export function Stepper({ step, tone = "dark", className = "" }: { step: 1 | 2 | 3; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  const { t } = useT();
  const steps = [t("booking.stepShowtime"), t("booking.stepSeats"), t("booking.stepCheckout")];
  return (
    <ol className={`flex items-center gap-2 text-[14px] md:gap-3 ${className}`} aria-label={t("booking.steps")}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "next";
        return (
          <li key={label} className="flex items-center gap-2 max-md:items-start md:gap-3" aria-current={state === "current" ? "step" : undefined}>
            <span className={`flex items-center gap-2 max-md:flex-col max-md:gap-1.5 max-md:text-[12px] ${state === "next" ? (light ? "text-ink/65" : "text-muted") : light ? "text-ink" : "text-white"}`}>
              <span
                className={`grid size-6 place-items-center rounded-pill font-mono text-[12px] tabular-nums ${
                  state === "current" ? "bg-purple text-white" : state === "done" ? (light ? "bg-purple/12 text-purple" : "bg-purple-light/20 text-purple-light") : light ? "border border-ink/20" : "border border-white/20"
                }`}
              >
                {state === "done" ? <Icon name="check" size={14} /> : n}
              </span>
              {/* phones: the label sits under the number (designer, Nov 27) */}
              <span>
                {label}
                {state === "done" && <span className="sr-only"> ({t("booking.stepDone")})</span>}
              </span>
            </span>
            {n < 3 && <span aria-hidden className={`h-px w-4 max-md:mt-3 max-md:w-6 md:w-8 ${light ? "bg-ink/15" : "bg-white/15"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
