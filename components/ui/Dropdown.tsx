"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type DropdownOption = { value: string; label: string; lang?: string; disabled?: boolean; hint?: string };

/**
 * Themed dropdown (designer, Nov 26) in place of the browser's own <select> list, which can't take the brand style:
 * a pill trigger that stays fully round when open, and a dark glass list 4px from it with purple-tinted rows and a
 * check on the current choice. Opens up or down (`placement`). Keyboard: Enter / Space / arrows open; arrows,
 * Home, End move; Enter / Space pick; Escape or Tab close. ARIA listbox pattern.
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
  const current = options.find((o) => o.value === value) ?? options[0];

  // close on a click outside
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [open]);
  // focus the list when it opens, keep the active row in view
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (i: number) => {
    if (options[i].disabled) return;
    onChange(options[i].value);
    setOpen(false);
    trigger.current?.focus();
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
        trigger.current?.focus();
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
          {current?.label}
        </span>
        <Icon name="chevronDown" size={16} className="dropdown-chevron shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
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
            {options.map((o, i) => (
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
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
