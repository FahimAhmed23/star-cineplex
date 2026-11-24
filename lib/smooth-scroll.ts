"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// §4 / §8.3: Lenis smooth scrolling, driven by the GSAP ticker and synced to ScrollTrigger, so scrubbed
// scroll stories move like a camera instead of in wheel steps. Off for reduced motion.

let lenis: Lenis | null = null;

export function startSmoothScroll(): () => void {
  if (lenis || typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const l = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis = l;
  l.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => l.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    l.destroy();
    lenis = null;
  };
}

/** Scroll the page; goes through Lenis when it runs, so its internal position never goes stale. */
export function scrollToY(y: number, smooth = false) {
  if (lenis) lenis.scrollTo(y, { immediate: !smooth, force: true });
  else window.scrollTo({ top: y, behavior: smooth ? "smooth" : ("instant" as ScrollBehavior) });
}

export function scrollToEl(el: Element, offset = 0, smooth = true) {
  const y = el.getBoundingClientRect().top + window.scrollY + offset;
  scrollToY(y, smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
