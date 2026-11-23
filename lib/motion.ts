// Motion tokens (CLAUDE.md §5) as GSAP eases, registered once.
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

/** --ease-out: UI entering */
export const EASE_OUT = CustomEase.create("sc-ease-out", "0.22,1,0.36,1");
/** --ease-in-out: camera moves, splits */
export const EASE_IN_OUT = CustomEase.create("sc-ease-in-out", "0.65,0,0.35,1");

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
