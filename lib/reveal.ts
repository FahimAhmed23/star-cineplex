// Shared entrance motion (designer reference, Nov 26: the Aave site).
// Cards rise from a little lower, out of a slight scale-down, one after another, once the headline has started.
const EASE = [0.22, 1, 0.36, 1] as const;

/** Props for a motion element that rises into view: index i in its group, base = when the group starts (s). */
export function riseIn(i: number, { base = 0.25, reduced = false, inView = true }: { base?: number; reduced?: boolean | null; inView?: boolean } = {}) {
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.97 };
  const shown = { opacity: 1, y: 0, scale: 1 };
  const transition = { duration: reduced ? 0.4 : 1, ease: EASE, delay: base + i * 0.09 };
  return inView
    ? { initial: hidden, whileInView: shown, viewport: { once: true, amount: 0.25 }, transition }
    : { initial: hidden, animate: shown, transition };
}
