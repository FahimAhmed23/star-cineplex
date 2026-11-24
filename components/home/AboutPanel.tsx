"use client";

import { SlideOver } from "@/components/nav/SlideOver";
import { useT } from "@/lib/i18n";

/** Footer → About (CLAUDE.md §7, §8.10): a slide-over with the case-study note and the credits. */
export function AboutPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const credits = ["about.credit1", "about.credit2", "about.credit3", "about.credit4", "about.credit5"];
  return (
    <SlideOver open={open} onClose={onClose} title={t("about.title")}>
      <p className="text-[15px] leading-relaxed text-white/80">{t("about.note")}</p>
      <h3 className="mt-8 mb-3 text-[14px] font-semibold text-white">{t("about.creditsTitle")}</h3>
      <ul className="space-y-2 text-[14px] text-muted">
        {credits.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
    </SlideOver>
  );
}
