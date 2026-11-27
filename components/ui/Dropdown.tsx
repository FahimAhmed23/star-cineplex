"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

export type DropdownOption = { value: string; label: string; lang?: string; disabled?: boolean; hint?: string; /** shorter text for the closed button on phones */ short?: string };

/**
 * Themed dropdown (designer, Nov 26) in place of the browser's own <select> list, which can't take the brand style:
 * a pill trigger that stays fully round when open, and a dark glass list 4px from it with purple-tinted rows and a
 * check on the current choice. Opens up or down (`placement`). Keyboard: Enter / Space / arrows open; arrows,
 * Home, End move; Enter / Space pick; Escape or Tab close. ARIA listbox pattern.
 * Phones (< 768px, designer Nov 27): the list opens as a floating panel like the navbar menu — 20px from each side
 * of the screen, night colour, 24px corners — right above or below the trigger (whichever side has room), portalled
 * to <body> with page scroll locked, so it never runs off the screen or pushes the page sideways.
 * Opening never scrolls the page: focus uses preventScroll and the active row is kept in view by moving only the
 * list's own scroll position.
 */
export function Dropdown({
  value,
  options,
  onChange,
  label,
  placement = "down",
  className = "",
  size = "md",
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label: string;
  placement?: "up" | "down";
  className?: string;
  size?: "md" | "lg";
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; maxH: number }>({ maxH: 400 });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const current = options.find((o) => o.value === value) ?? options[0];

  // close on a click outside
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !sheet.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [open]);
  // focus the list when it opens, keep the active row in view
  useEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open, phone]);
  useEffect(() => {
    const ul = list.current;
    const li = ul?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!open || !ul || !li) return;
    // only the list scrolls (scrollIntoView would also move the page)
    if (li.offsetTop < ul.scrollTop) ul.scrollTop = li.offsetTop - 6;
    else if (li.offsetTop + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = li.offsetTop + li.offsetHeight - ul.clientHeight + 6;
  }, [open, active, phone]);
  // phones: the sheet covers the page, so the page underneath must not scroll
  useEffect(() => {
    if (!open || !phone) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open, phone]);

  // phones: place the panel next to the trigger, on the side with more room
  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const gap = 8, edge = 20;
    const below = vh - r.bottom - gap - edge;
    const above = r.top - gap - edge;
    const down = placement === "down" ? below >= 240 || below >= above : below > above && above < 240;
    setPos(down ? { top: r.bottom + gap, maxH: below } : { bottom: vh - r.top + gap, maxH: above });
  };
  useEffect(() => {
    if (!open || !phone) return;
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });

  const show = () => {
    if (phone) place();
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (i: number) => {
    if (options[i].disabled) return;
    onChange(options[i].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      },
    };
    if (e.key === "Tab") return setOpen(false);
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const h = size === "lg" ? "h-11 text-[15px]" : "h-10 text-[14px]";
  const y = reduced ? 0 : placement === "up" ? 6 : -6;

  const items = options.map((o, i) => (
    <li
      key={o.value}
      id={`${id}-o${i}`}
      data-i={i}
      role="option"
      aria-selected={o.value === value}
      lang={o.lang}
      aria-disabled={o.disabled || undefined}
      className={`dropdown-option ${i === active ? "is-active" : ""} ${o.disabled ? "is-disabled" : ""}`}
      onPointerEnter={() => setActive(i)}
      onClick={() => pick(i)}
    >
      <span className="truncate">{o.label}</span>
      {o.hint && <span className="ml-auto shrink-0 text-[12px] text-muted">{o.hint}</span>}
      {o.value === value && <Icon name="check" size={16} className="shrink-0 text-purple-light" />}
    </li>
  ));

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onTriggerKey}
        className={`dropdown-trigger focus-ring ${h} ${open ? "is-open" : ""}`}
      >
        <span className="truncate" lang={current?.lang}>
          {current?.short ? (
            <>
              <span className="md:hidden">{current.short}</span>
              <span className="max-md:hidden">{current.label}</span>
            </>
          ) : (
            current?.label
          )}
        </span>
        <Icon name="chevronDown" size={size === "lg" ? 16 : 14} className="dropdown-chevron shrink-0" />
      </button>

      <AnimatePresence>
        {open && !phone && (
          <motion.ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-o${active}`}
            onKeyDown={onListKey}
            className={`dropdown-list ${placement === "up" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"}`}
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {items}
          </motion.ul>
        )}
      </AnimatePresence>
      {phone &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={sheet}
                className="dropdown-sheet"
                style={{ top: pos.top, bottom: pos.bottom, maxHeight: Math.min(pos.maxH, 440) }}
                initial={{ opacity: 0, y: reduced ? 0 : pos.top !== undefined ? -6 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : pos.top !== undefined ? -6 : 6, transition: { duration: 0.15 } }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ul
                  ref={list}
                  id={`${id}-list`}
                  role="listbox"
                  tabIndex={-1}
                  aria-label={label}
                  aria-activedescendant={`${id}-o${active}`}
                  onKeyDown={onListKey}
                  className="dropdown-sheet__list"
                >
                  {items}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
