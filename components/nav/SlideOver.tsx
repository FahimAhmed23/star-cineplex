"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";

/**
 * The slide-over used by Prices, My tickets and About (§7): glass panel from the right, dimmed page behind,
 * focus moves to ✕, Escape or a click outside closes it, focus returns to whatever opened it.
 */
export function SlideOver({ open, onClose, title, children, width = 440 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // keep Tab inside the panel
      if (e.key === "Tab") {
        const panel = closeBtn.current?.closest("[role=dialog]");
        const items = panel?.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex='-1'])");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            className="glass absolute inset-y-3 right-3 flex flex-col overflow-y-auto rounded-card-lg border border-white/10 p-8 text-white"
            style={{ width: `min(92vw, ${width}px)` }}
            initial={{ x: reduced ? 0 : 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id={id} className="display-s text-white">
                {title}
              </h2>
              <button ref={closeBtn} type="button" onClick={onClose} className="focus-ring grid size-9 shrink-0 place-items-center rounded-pill text-muted hover:text-white" aria-label={t("common.close")}>
                <Icon name="closeSimple" size={20} />
              </button>
            </div>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
