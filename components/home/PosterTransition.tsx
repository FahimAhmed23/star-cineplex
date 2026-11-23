"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

export const fullScreen = (): Box => ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, radius: 0 });
export const boxOf = (el: Element, radius = 24): Box => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, radius };
};

interface Props {
  poster: string;
  from: Box;
  to: Box;
  /** fade in at the start (Back: the poster first covers the hall) */
  fadeIn?: boolean;
  /** fade out at the end (Open: the poster dissolves into the hall) */
  fadeOut?: boolean;
  onArrive: () => void;
  onDone: () => void;
}

/**
 * Shared-element expand for the Trailer view (CLAUDE.md §8.7): the clicked card's poster grows from its
 * place to fill the screen (≈700ms), the page jumps under it, then it cross-fades into the hall.
 * Back plays it in reverse, shrinking into the same card.
 *
 * Motion note: this animates top / left / width / height on purpose. It is a single fixed-position element,
 * outside the page flow (nothing else re-lays out), for 700ms — and a transform scale would stretch the
 * poster between the card's 2:3 and the screen's shape. object-fit: cover keeps the image right throughout.
 */
export function PosterTransition({ poster, from, to, fadeIn, fadeOut, onArrive, onDone }: Props) {
  const arrived = useRef(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <motion.div
      className="fixed z-[70] overflow-hidden bg-night"
      initial={{ ...toStyle(from), opacity: fadeIn ? 0 : 1 }}
      animate={{
        ...toStyle(to),
        opacity: fadeOut ? [1, 1, 0] : 1,
      }}
      transition={{
        duration: reduced ? 0.01 : 0.7,
        ease: [0.65, 0, 0.35, 1],
        opacity: fadeIn
          ? { duration: reduced ? 0.01 : 0.25 }
          : fadeOut
            ? { duration: reduced ? 0.3 : 1.1, times: [0, 0.64, 1] }
            : undefined,
      }}
      onAnimationComplete={onDone}
      onUpdate={(v) => {
        // the page may jump once the poster fully covers the screen
        if (!arrived.current && typeof v.width === "number" && Math.abs(v.width - to.width) < 1 && Math.abs((v.height as number) - to.height) < 1) {
          arrived.current = true;
          onArrive();
        }
      }}
      aria-hidden
    >
      <Image src={poster} alt="" fill sizes="100vw" className="object-cover" priority />
      <div className="absolute inset-0 bg-night/35" />
    </motion.div>
  );
}
function toStyle(b: Box) {
  return { top: b.top, left: b.left, width: b.width, height: b.height, borderRadius: b.radius };
}
