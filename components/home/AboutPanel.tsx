"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";

/** Footer → About (CLAUDE.md §7, §8.10): a slide-over with the case-study note and the credits. */
export function AboutPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const credits = ["about.credit1", "about.credit2", "about.credit3", "about.credit4", "about.credit5"];

  // rendered into <body>, above the fixed navbar (the footer sits in a lower stacking context)
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className="glass absolute inset-y-3 right-3 flex w-[min(92vw,440px)] flex-col overflow-y-auto rounded-card-lg border border-white/10 p-8"
            initial={{ x: reduced ? 0 : 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="about-title" className="display-s text-white">
                {t("about.title")}
              </h2>
              <button ref={closeBtn} type="button" onClick={onClose} className="focus-ring grid size-9 shrink-0 place-items-center rounded-pill text-muted hover:text-white" aria-label={t("about.close")}>
                <Icon name="closeSimple" size={20} />
              </button>
            </div>
            <p className="text-[15px] leading-relaxed text-white/80">{t("about.note")}</p>
            <h3 className="mt-8 mb-3 text-[14px] font-semibold text-white">{t("about.creditsTitle")}</h3>
            <ul className="space-y-2 text-[14px] text-muted">
              {credits.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
