// §8.3 "Into the hall": shared timing for the scroll story. p = 0..1 over the pinned scroll.

/** smoothstep between a and b */
export function band(a: number, b: number, p: number) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export const STORY = {
  /** pinned scroll length, in viewport heights */
  length: 2.6,
  handover: [0, 0.15] as const, // beat 1: hero info + "Tonight at" leave
  titleIn: [0.08, 0.34] as const, // beat 2: the giant title rises
  factsIn: [0.18, 0.3] as const,
  factsOut: [0.38, 0.48] as const,
  walk: [0.4, 0.75] as const, // beat 3: title exits, camera walks down the aisle
  titleOut: [0.42, 0.7] as const,
  head: [0.5, 0.64] as const, // headline block
  cards: 0.55, // beat 4: first card starts; each next one 0.06 later
  cardStep: 0.06,
};
