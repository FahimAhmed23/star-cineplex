"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties } from "react";

type Tag = "h1" | "h2" | "h3" | "p" | "span";

/**
 * Headline reveal (designer reference, Nov 26: the Aave site): the words arrive one after another, each rising a
 * little out of a soft blur, so the line reads left to right as it lands. Plays once.
 * - default: when it scrolls into view
 * - `show`: controlled (e.g. a pinned lockup that turns on, or the hero on mount / carousel change)
 * Screen readers get the whole line once (hidden copy); reduced motion: a plain fade.
 */
export function RevealText({
  text,
  as = "span",
  className,
  style,
  id,
  lang,
  delay = 0,
  stagger = 0.07,
  show,
  amount = 0.6,
}: {
  text: string;
  as?: Tag;
  className?: string;
  style?: CSSProperties;
  id?: string;
  lang?: string;
  delay?: number;
  stagger?: number;
  show?: boolean;
  amount?: number;
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  const parts = text.split(/(\s+)/).filter(Boolean);

  const line: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: delay } },
  };
  const word: Variants = reduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }
    : {
        hidden: { opacity: 0, y: "0.3em", filter: "blur(8px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], opacity: { duration: 1.1, ease: [0.22, 1, 0.36, 1] } },
        },
      };
  const control =
    show === undefined
      ? { initial: "hidden", whileInView: "show", viewport: { once: true, amount } }
      : { initial: "hidden", animate: show ? "show" : "hidden" };

  return (
    <Comp id={id} lang={lang} className={className} style={style} variants={line} {...control}>
      <span className="sr-only">{text}</span>
      {parts.map((p, i) =>
        /^\s+$/.test(p) ? (
          <span key={i} aria-hidden>
            {" "}
          </span>
        ) : (
          <motion.span key={i} aria-hidden className="reveal-word inline-block" variants={word}>
            {p}
          </motion.span>
        ),
      )}
    </Comp>
  );
}

/** Seconds until the last word of `text` has mostly landed — to start what follows it (subline, buttons). */
export function revealDuration(text: string, delay = 0, stagger = 0.07) {
  const n = text.split(/\s+/).filter(Boolean).length;
  return delay + Math.max(0, n - 1) * stagger + 0.45;
}
