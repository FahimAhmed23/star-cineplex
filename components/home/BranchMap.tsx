"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { branches } from "@/lib/data";
import { useT } from "@/lib/i18n";
import map from "@/data/branch-map.json";

type Pt = { x: number; y: number };
/** the zoomed crop of the country (Dhaka, Narayanganj and Chattogram), in the outline's own units */
const CROP = map.zoom.crop;
/** each branch's star, in % of the crop (spread a little so neighbouring Dhaka branches don't sit on each other) */
const STARS = map.zoom.points as Record<string, Pt>;
const EASE = [0.22, 1, 0.36, 1] as const;

const ordered = [...branches].sort((a, b) => a.order - b.order);

/** a small city name near each group of stars (in % of the crop) */
const CITY_LABELS: { key: string; x: number; y: number; align: "left" | "right" }[] = [
  { key: "home.cityDhaka", x: 41.4, y: 40.6, align: "right" },
  { key: "home.cityNarayanganj", x: 55, y: 49.9, align: "left" },
  { key: "home.cityChattogram", x: 76.6, y: 71.2, align: "right" },
];

/**
 * Branches — "One Star. Nine homes." (CLAUDE.md §8.9, map revised Nov 27): every branch listed on the left with
 * its area; on the right a zoomed map of central and south-east Bangladesh in dots (fading out at the edges) with a
 * star on each branch. Hovering a branch (its star or its row) shows a card with that branch's own hall beside the
 * star; nothing shows otherwise. A pure showcase: no booking actions here.
 */
export function BranchMap() {
  const { t, lang } = useT();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const current = active ? ordered.find((b) => b.slug === active) : undefined;
  const num = (slug: string) => String(ordered.findIndex((b) => b.slug === slug) + 1).padStart(2, "0");
  const name = (b: (typeof ordered)[number]) => (lang === "bn" && b.nameBn) || b.name;
  const area = (b: (typeof ordered)[number]) => (lang === "bn" && b.areaBn) || b.area;
  const line = (slug: string) => t(`home.reelLines.${slug}`);

  const groups = useMemo(() => {
    const g = new Map<string, typeof ordered>();
    for (const b of ordered) g.set(b.city, [...(g.get(b.city) ?? []), b]);
    return [...g.entries()];
  }, []);
  const cityLabel = (city: string) => t(city === "Dhaka" ? "home.cityDhaka" : city === "Narayanganj" ? "home.cityNarayanganj" : "home.cityChattogram");
  /** the part of the address under the city header: "Panthapath, Dhaka" → "Panthapath"; nothing when it is only the city */
  const place = (b: (typeof ordered)[number]) => {
    const first = area(b).split(",")[0].trim();
    return b.area.split(",")[0].trim() === b.city ? "" : first;
  };

  const vp = { once: true, amount: 0.3 };

  // the hover card sits beside its whole group of stars, never on top of a neighbour: to the left of the group for
  // groups on the right half, to the right otherwise, 56px clear of the outermost star
  const cardPos = (slug: string) => {
    const city = ordered.find((b) => b.slug === slug)!.city;
    const group = ordered.filter((b) => b.city === city || (city !== "Chattogram" && b.city !== "Chattogram")).map((b) => STARS[b.slug]);
    const p = STARS[slug];
    const left = p.x > 50;
    const edge = left ? Math.min(...group.map((g) => g.x)) : Math.max(...group.map((g) => g.x));
    return {
      top: `${Math.min(Math.max(p.y, 22), 78)}%`,
      ...(left ? { right: `calc(${100 - edge}% + 56px)` } : { left: `calc(${edge}% + 56px)` }),
    };
  };

  return (
    <section
      id="branches"
      aria-labelledby="branches-title"
      className="relative scroll-mt-24 overflow-hidden bg-night pt-[100px] pb-[200px] max-md:pt-[60px] max-md:pb-[60px]"
    >
      {/* left: headline + every branch, grouped by city */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-[1280px] px-8 max-md:px-5">
        <div className="pointer-events-auto max-lg:mx-auto max-lg:max-w-[440px] lg:w-[440px]">
          <h2 id="branches-title" className="display-m max-w-[6em] text-white max-lg:mx-auto max-lg:text-center">
            <RevealText text={t("home.reelTitle")} />
          </h2>
          <RevealText as="p" className="mt-3 block text-[16px] text-muted max-lg:text-center" text={t("home.reelSub")} delay={0.35} stagger={0.04} />

          <div className="mt-10 max-[821px]:mt-8 space-y-4">
            {groups.map(([city, list], gi) => (
              <motion.div
                key={city}
                initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.3 + gi * 0.12 }}
              >
                <p className="mb-1 flex items-center gap-2 text-[13px] font-medium text-muted">
                  {cityLabel(city)}
                  <span className="font-mono text-[12px] text-white/35">{list.length}</span>
                </p>
                <ul>
                  {list.map((b) => (
                    <li key={b.slug}>
                      <button
                        type="button"
                        className="branch-row focus-ring"
                        aria-pressed={b.slug === active}
                        onMouseEnter={() => setActive(b.slug)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(b.slug)}
                        onBlur={() => setActive(null)}
                        onClick={() => setActive(b.slug)}
                      >
                        <span className="font-mono text-[12px] text-purple-light">{num(b.slug)}</span>
                        <span className="branch-row__name">{name(b)}</span>
                        {place(b) && <span className="ml-auto shrink-0 pl-4 text-[13px] text-muted">{place(b)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* right: the map, centred between the list and the section's right edge, fading out towards the corners */}
      <div className="branch-map max-lg:hidden max-lg:relative max-lg:mt-10 max-lg:px-5 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(max(0px,(100%_-_1280px)/2)_+_472px)] lg:flex lg:justify-center">
        <div
          className="relative max-lg:w-full lg:h-full"
          style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}
          onMouseLeave={() => setActive(null)}
        >
          <motion.svg
            viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
            className="branch-map__land absolute inset-0 size-full"
            role="img"
            aria-label={t("home.mapLabel")}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={vp}
            transition={{ duration: reduced ? 0.4 : 1.4, ease: EASE }}
          >
            <defs>
              <pattern id="bm-dots" width="4.4" height="4.4" patternUnits="userSpaceOnUse">
                <circle cx="2.2" cy="2.2" r="0.75" fill="#B784D6" />
              </pattern>
              <clipPath id="bm-country">
                <path d={map.outline} />
              </clipPath>
            </defs>
            <rect x={CROP.x} y={CROP.y} width={CROP.w} height={CROP.h} fill="url(#bm-dots)" clipPath="url(#bm-country)" opacity="0.4" />
            <path d={map.outline} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </motion.svg>

          {/* city names */}
          {CITY_LABELS.map((c, i) => (
            <motion.span
              key={c.key}
              className="branch-map__city"
              style={{ left: `${c.x}%`, top: `${c.y}%`, translate: c.align === "right" ? "-100% -50%" : "0 -50%" }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={vp}
              transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : 1.2 + i * 0.1 }}
            >
              {t(c.key)}
            </motion.span>
          ))}

          {/* a star on each branch */}
          {ordered.map((b, i) => {
            const p = STARS[b.slug];
            const on = b.slug === active;
            return (
              <motion.button
                key={b.slug}
                type="button"
                className="branch-star focus-ring"
                data-on={on || undefined}
                aria-label={`${name(b)}, ${area(b)}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.4 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={vp}
                transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : 0.6 + i * 0.07 }}
                onMouseEnter={() => setActive(b.slug)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(b.slug)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(on ? null : b.slug)}
              >
                <svg viewBox="-10 -10 20 20" aria-hidden>
                  <path d="M0,-9L2.38,-3.28L8.56,-2.78L3.85,1.25L5.29,7.28L0,4.05L-5.29,7.28L-3.85,1.25L-8.56,-2.78L-2.38,-3.28Z" />
                </svg>
              </motion.button>
            );
          })}

          {/* the hover card, beside its star */}
          <AnimatePresence>
            {current && (
              <motion.figure
                key={current.slug}
                className="branch-card branch-card--float"
                style={cardPos(current.slug)}
                initial={{ opacity: 0, y: reduced ? "-50%" : "calc(-50% + 10px)" }}
                animate={{ opacity: 1, y: "-50%" }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, ease: EASE }}
                aria-live="polite"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-night">
                  <Image src={`/branches/halls/${current.slug}.webp`} alt="" fill sizes="300px" className="object-cover" />
                </div>
                <figcaption className="px-5 pt-3 pb-4">
                  <p className="font-mono text-[12px] text-purple-light">{num(current.slug)}</p>
                  <p className="mt-1 text-[20px] font-semibold text-white">{name(current)}</p>
                  <p className="text-[13px] text-muted">{area(current)}</p>
                  <p className="mt-2 text-[15px] text-paper/80">{line(current.slug)}</p>
                </figcaption>
              </motion.figure>
            )}
          </AnimatePresence>
        </div>
        <p className="branch-map__note">{t("home.mapNote")}</p>
      </div>
    </section>
  );
}
