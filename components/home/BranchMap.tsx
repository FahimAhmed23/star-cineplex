"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { RevealText } from "@/components/ui/RevealText";
import { branches } from "@/lib/data";
import { useT } from "@/lib/i18n";
import map from "@/data/branch-map.json";

type Pt = { x: number; y: number };
const [VW, VH] = map.viewBox as [number, number];
const POINTS = map.points as Record<string, { map: Pt; lens?: Pt }>;
const LENS = map.lens;
const HUB = map.hub;
const EASE = [0.22, 1, 0.36, 1] as const;

/** a five-point star (the "Star" of Star Cineplex), centred on 0,0 */
function starPath(r: number) {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${p.join("L")}Z`;
}
const STAR = starPath(9);
const STAR_SMALL = starPath(6);

const ordered = [...branches].sort((a, b) => a.order - b.order);
const lensSlugs = ordered.filter((b) => POINTS[b.slug]?.lens).map((b) => b.slug);
const mapOnly = ordered.filter((b) => !POINTS[b.slug]?.lens).map((b) => b.slug);

/** the constellation inside the lens: a nearest-neighbour path from the northernmost star */
const chain = (() => {
  const left = [...lensSlugs];
  left.sort((a, b) => POINTS[a].lens!.y - POINTS[b].lens!.y);
  const out = [left.shift()!];
  while (left.length) {
    const p = POINTS[out[out.length - 1]].lens!;
    left.sort((a, b) => Math.hypot(POINTS[a].lens!.x - p.x, POINTS[a].lens!.y - p.y) - Math.hypot(POINTS[b].lens!.x - p.x, POINTS[b].lens!.y - p.y));
    out.push(left.shift()!);
  }
  return out;
})();

/** where the connector from the Dhaka hub meets the lens */
const lensEdge = (() => {
  const dx = HUB.x - LENS.cx;
  const dy = HUB.y - LENS.cy;
  const d = Math.hypot(dx, dy);
  return { x: LENS.cx + (dx / d) * LENS.r, y: LENS.cy + (dy / d) * LENS.r };
})();

/**
 * Branches — "One Star. Nine homes." (CLAUDE.md §8.9, rebuilt Nov 26 as the constellation map):
 * all nine branches at once. Bangladesh drawn in dots from open map data, each branch a star; Dhaka's six and
 * Narayanganj are magnified in a lens. Hovering a branch (list or star) shows a card with that branch's own hall,
 * rendered by the hall engine in its real look (§6 themes). A pure showcase: no booking actions here.
 */
export function BranchMap() {
  const { t, lang } = useT();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(ordered[0].slug);
  const current = ordered.find((b) => b.slug === active)!;
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

  // entrance: dots and outline first, then the lens, then the stars in order, then the lines
  const show = { opacity: 1, scale: 1 };
  const vp = { once: true, amount: 0.35 };
  const appear = (delay: number, dur = 0.8) => ({
    initial: { opacity: 0, scale: reduced ? 1 : 0.6 },
    whileInView: show,
    viewport: vp,
    transition: { duration: reduced ? 0.4 : dur, ease: EASE, delay: reduced ? 0 : delay },
  });
  const draw = (delay: number, dur = 1.2) => ({
    initial: { pathLength: reduced ? 1 : 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: vp,
    transition: { duration: reduced ? 0.4 : dur, ease: EASE, delay: reduced ? 0 : delay },
  });

  const starAt = (slug: string, p: Pt, small = false, delay = 0) => {
    const on = slug === active;
    return (
      <motion.g key={`${slug}-${small ? "m" : "l"}`} {...appear(delay, 0.6)} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
        <g
          transform={`translate(${p.x} ${p.y})`}
          className="branch-star"
          data-on={on || undefined}
          onMouseEnter={() => setActive(slug)}
          onClick={() => {
            setActive(slug);
            toCard(slug);
          }}
          style={{ cursor: "default" }}
        >
          <circle r={on ? 28 : 18} className="branch-star__halo" />
          <path d={small ? STAR_SMALL : STAR} className="branch-star__shape" />
          <circle r="16" fill="transparent" />
        </g>
      </motion.g>
    );
  };

  const cardBody = (b: (typeof ordered)[number]) => (
    <>
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-card-sm bg-night">
        <Image src={`/branches/halls/${b.slug}.webp`} alt="" fill sizes="(max-width: 1024px) 84vw, 360px" className="object-cover" />
      </div>
      <figcaption className="px-5 pt-3 pb-4">
        <p className="font-mono text-[12px] text-purple-light">{num(b.slug)}</p>
        <p className="mt-1 text-[20px] font-semibold text-white">{name(b)}</p>
        <p className="text-[13px] text-muted">{area(b)}</p>
        <p className="mt-2 text-[15px] text-paper/80">{line(b.slug)}</p>
      </figcaption>
    </>
  );
  const card = (
    <AnimatePresence mode="wait">
      <motion.figure
        key={current.slug}
        initial={{ opacity: 0, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: 0.18 } }}
        transition={{ duration: 0.45, ease: EASE }}
        className="branch-card"
        aria-live="polite"
      >
        {cardBody(current)}
      </motion.figure>
    </AnimatePresence>
  );

  // phones / tablets: swipe through all nine cards; the one in view lights its star
  const rail = useRef<HTMLDivElement>(null);
  const onRail = () => {
    const el = rail.current;
    if (!el) return;
    const kids = [...el.children] as HTMLElement[];
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bd = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (ordered[best] && ordered[best].slug !== active) setActive(ordered[best].slug);
  };
  const toCard = (slug: string) => {
    const el = rail.current;
    const k = el?.children[ordered.findIndex((b) => b.slug === slug)] as HTMLElement | undefined;
    if (el && k) el.scrollTo({ left: k.offsetLeft - (el.clientWidth - k.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section id="branches" aria-labelledby="branches-title" className="relative scroll-mt-24 overflow-hidden bg-night pt-[100px] pb-[100px]">
      <div className="mx-auto grid max-w-[1280px] gap-x-12 gap-y-8 px-8 max-md:px-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        {/* headline */}
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <h2 id="branches-title" className="display-m text-white">
            <RevealText text={t("home.reelTitle")} />
          </h2>
          <RevealText as="p" className="mt-3 block text-[16px] text-muted" text={t("home.reelSub")} delay={0.35} stagger={0.04} />
        </div>

        {/* every branch, grouped by city (desktop; phones swipe the cards instead) */}
        <div className="max-lg:hidden lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="space-y-4">
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
                        onFocus={() => setActive(b.slug)}
                        onClick={() => setActive(b.slug)}
                      >
                        <span className="font-mono text-[12px] text-purple-light">{num(b.slug)}</span>
                        <span className="branch-row__name whitespace-nowrap">{name(b)}</span>
                        {/* the area, when it says more than the city above it (it gives way to a long name) */}
                        {b.area.split(",")[0] !== b.city && (
                          <span className="ml-auto min-w-0 truncate pl-3 text-[13px] text-muted max-sm:hidden">{area(b).split(",")[0]}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* the map */}
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <div className="relative w-full" style={{ aspectRatio: `${VW} / ${VH}` }}>
            <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 size-full overflow-visible" role="img" aria-label={t("home.mapLabel")}>
              <defs>
                <pattern id="bm-dots" width="9" height="9" patternUnits="userSpaceOnUse">
                  <circle cx="4.5" cy="4.5" r="1.35" fill="#B784D6" />
                </pattern>
                <pattern id="bm-dots-fine" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="5" cy="5" r="1" fill="#B784D6" />
                </pattern>
                <clipPath id="bm-country">
                  <path d={map.outline} />
                </clipPath>
                <clipPath id="bm-lens">
                  <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} />
                </clipPath>
                <radialGradient id="bm-glow">
                  <stop offset="0" stopColor="#B784D6" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#B784D6" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* the country, in dots */}
              <motion.g {...appear(0, 1.2)} initial={{ opacity: 0 }}>
                <rect width={VW} height={VH} fill="url(#bm-dots)" clipPath="url(#bm-country)" opacity="0.32" />
                <path d={map.outline} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="1" />
              </motion.g>
              <motion.circle cx={HUB.x} cy={HUB.y} r="90" fill="url(#bm-glow)" {...appear(0.4, 1.4)} />

              {/* Dhaka → the lens; Dhaka → Chattogram */}
              <motion.line x1={HUB.x} y1={HUB.y} x2={lensEdge.x} y2={lensEdge.y} stroke="rgb(183 132 214 / 0.45)" strokeWidth="1" strokeDasharray="3 5" {...draw(0.6, 0.9)} />
              {mapOnly.length > 0 && (
                <motion.path
                  d={`M${HUB.x},${HUB.y} Q${(HUB.x + POINTS[mapOnly[0]].map.x) / 2 + 60},${(HUB.y + POINTS[mapOnly[0]].map.y) / 2 - 40} ${POINTS[mapOnly[0]].map.x},${POINTS[mapOnly[0]].map.y}`}
                  fill="none"
                  stroke="rgb(183 132 214 / 0.45)"
                  strokeWidth="1"
                  {...draw(1.2, 1)}
                />
              )}

              {/* the lens: Dhaka & Narayanganj, magnified */}
              <motion.g {...appear(0.5, 1)} style={{ transformOrigin: `${LENS.cx}px ${LENS.cy}px` }}>
                <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} fill="#0D0A12" />
                <rect x={LENS.cx - LENS.r} y={LENS.cy - LENS.r} width={LENS.r * 2} height={LENS.r * 2} fill="url(#bm-dots-fine)" clipPath="url(#bm-lens)" opacity="0.16" />
                <circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} fill="none" stroke="rgb(183 132 214 / 0.35)" strokeWidth="1" />
                <text x={LENS.cx} y={LENS.cy - LENS.r - 14} textAnchor="middle" className="branch-map__label">
                  {t("home.mapDhaka")}
                </text>
              </motion.g>
              <motion.polyline
                points={chain.map((s) => `${POINTS[s].lens!.x},${POINTS[s].lens!.y}`).join(" ")}
                fill="none"
                stroke="rgb(183 132 214 / 0.4)"
                strokeWidth="1"
                {...draw(1.3, 1.4)}
              />

              {/* the Dhaka hub on the country map */}
              <motion.circle cx={HUB.x} cy={HUB.y} r="4" fill="#FAF9F5" {...appear(0.7, 0.6)} style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }} />
              {mapOnly.length > 0 && (
                <motion.text
                  x={(POINTS[mapOnly[0]].map.x + POINTS[mapOnly[mapOnly.length - 1]].map.x) / 2 + 26}
                  y={POINTS[mapOnly[0]].map.y + 5}
                  className="branch-map__label"
                  {...appear(1.6, 0.6)}
                >
                  {t("home.mapCtg")}
                </motion.text>
              )}

              {/* the stars, in branch order */}
              {ordered.map((b, i) => {
                const p = POINTS[b.slug];
                return p.lens ? starAt(b.slug, p.lens, false, 0.9 + i * 0.08) : starAt(b.slug, p.map, true, 0.9 + i * 0.08);
              })}
            </svg>

            {/* the card: in the open space below the lens (desktop) */}
            <div className="absolute right-0 bottom-0 w-[41%] max-lg:hidden">{card}</div>
          </div>
          <p className="mt-3 text-right text-[12px] text-white/35 max-lg:hidden">{t("home.mapNote")}</p>
          {/* phones / tablets: all nine cards in a swipe row under the map */}
          <div ref={rail} onScroll={onRail} className="branch-rail lg:hidden" aria-label={t("home.mapLabel")}>
            {ordered.map((b) => (
              <figure key={b.slug} className="branch-card branch-rail__card" data-on={b.slug === active || undefined}>
                {cardBody(b)}
              </figure>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-white/35 lg:hidden">{t("home.mapNote")}</p>
        </div>
      </div>
    </section>
  );
}
