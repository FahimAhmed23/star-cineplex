"use client";

import { View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { getHall, getMovie, hallTheme, hallName } from "@/lib/data";
import { formatTime } from "@/lib/demo-date";
import { useDoors } from "@/lib/doors";
import { useDevice } from "@/lib/device";
import { useT } from "@/lib/i18n";
import type { HallType } from "@/lib/types";
import type { HallInfo, ShowSlot } from "./BookingStepOne";
import { SeatTurntable } from "./SeatTurntable";
import { RevealText } from "@/components/ui/RevealText";
import { riseIn } from "@/lib/reveal";

const ORDER: HallType[] = ["vip", "premium", "atmos"]; // §9.3 card order
const MODEL = { vip: "vip", premium: "premium", atmos: "atmos" } as const;
const FILLING = 0.7;

/**
 * "Choose your experience" (CLAUDE.md §9.3): one card per hall type showing this movie on this date, each with
 * a turning 3D seat (all three in ONE shared canvas via drei <View>), details, price range and showtime chips.
 * A chip → the cinema doors (§9.4) → seat selection.
 */
export function ExperienceCards({ movie, slots, halls }: { movie: string; slots: ShowSlot[]; halls: Record<string, HallInfo> }) {
  const { t, lang } = useT();
  const reduced = useReducedMotion();
  const router = useRouter();
  const go = useDoors((s) => s.go);
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HallType | null>(null);
  const [mounted, setMounted] = useState(false);
  const { phone } = useDevice();
  useEffect(() => setMounted(true), []);
  const m = getMovie(movie);
  const title = (m && ((lang === "bn" && m.titleBn) || m.title)) ?? movie;

  const groups = ORDER.map((type) => {
    const shows = slots.filter((s) => halls[s.hall]?.type === type).sort((a, b) => a.time.localeCompare(b.time));
    const hallList = [...new Set(shows.map((s) => s.hall))].map((id) => halls[id]).sort((a, b) => a.name.localeCompare(b.name));
    const typeHalls = Object.values(halls).filter((h) => h.type === type && h.branch === slots[0]?.branch);
    const prices = typeHalls.flatMap((h) => Object.values(h.prices).flatMap((band) => Object.values(band ?? {}) as number[]));
    const formats = [...new Set(shows.map((s) => s.format))];
    return { type, shows, hallList, typeHalls, prices, formats };
  }).filter((g) => g.shows.length > 0);

  const pick = (s: ShowSlot) => {
    const hall = halls[s.hall];
    go(`/book/seats/${s.id}`, { hall: hallName(hall, lang).toUpperCase(), line: `${title} · ${formatTime(s.time)}` }, router.push);
  };

  const hallsLine = (g: (typeof groups)[number]) => {
    const nums = g.typeHalls.map((h) => h.name.replace(/\D+/g, "")).sort();
    const names = nums.length > 1 ? t("booking.hallsPlural", { list: `${nums[0]}–${nums[nums.length - 1]}` }) : g.typeHalls[0]?.name;
    const cap = g.typeHalls[0]?.capacity ?? 0;
    const seats = nums.length > 1 ? t("booking.seatsEach", { count: cap }) : t("booking.seats", { count: cap });
    return [names, seats, g.formats.join(" / ")].join(" · ");
  };

  return (
    <motion.section
      ref={root}
      aria-labelledby="experience-title"
      initial={{ opacity: 0, y: reduced ? 0 : 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-10 border-t border-white/10 pt-12"
    >
      <h2 id="experience-title" className="display-s mb-8 text-white">
        <RevealText text={t("booking.chooseExperience")} show delay={0.15} />
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((g, gi) => {
          const theme = g.typeHalls[0] ? hallTheme(getHall(g.typeHalls[0].id)!) : null;
          const vip = g.type === "vip";
          const color = vip ? (theme?.leather ?? "#6B1E24") : (theme?.seat ?? "#C0262D");
          const min = Math.min(...g.prices);
          const max = Math.max(...g.prices);
          return (
            <motion.article
              key={g.type}
              {...riseIn(gi, { base: 0.35, reduced, inView: false })}
              className={`experience-card ${hover === g.type ? "is-hover" : ""}`}
              onMouseEnter={() => setHover(g.type)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="experience-card__stage relative aspect-[16/11] overflow-hidden rounded-t-card-md bg-night">
                {mounted && phone && (
                  // §11 phones: a still render of the seat instead of the live turntable
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/seats/${g.type}.webp`} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                {mounted && !phone && (
                  <View className="absolute inset-0">
                    <Suspense fallback={null}>
                      <SeatTurntable model={MODEL[g.type]} color={color} leather={vip} hover={hover === g.type} rings={g.type === "atmos"} />
                    </Suspense>
                  </View>
                )}
              </div>
              <div className="p-6">
                <h3 className="display-s text-white" style={{ fontSize: 36 }}>
                  {t(`booking.hall${g.type[0].toUpperCase()}${g.type.slice(1)}`)}
                </h3>
                <p className="mt-2 text-[14px] text-muted">{hallsLine(g)}</p>
                <p className="mt-3 text-[16px] font-semibold text-white tabular-nums">{t("booking.priceRange", { min, max })}</p>
                {g.type === "premium" && <p className="mt-1 text-[13px] text-purple-light">{t("booking.semiNote")}</p>}
                <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("booking.pickShowtime")}>
                  {g.shows.map((s) => {
                    const cap = halls[s.hall].capacity;
                    const ratio = s.booked / cap;
                    const sold = s.booked >= cap;
                    const state = sold ? "sold" : ratio > FILLING ? "filling" : "available";
                    const label = t(sold ? "booking.soldOut" : ratio > FILLING ? "booking.fillingFast" : "booking.available");
                    return (
                      <li key={s.id}>
                        <button type="button" disabled={sold} onClick={() => pick(s)} className="show-chip focus-ring" aria-label={`${formatTime(s.time)} · ${hallName(halls[s.hall], lang)} · ${label}`}>
                          <span className={`show-chip__dot show-chip__dot--${state}`} aria-hidden />
                          <span className="tabular-nums">{formatTime(s.time)}</span>
                          <span className="text-muted">· {hallName(halls[s.hall], lang)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.article>
          );
        })}
      </div>
      {/* one shared WebGL canvas for all turntables (§9.3 performance) */}
      {mounted && !phone && (
        <Canvas
          eventSource={root as React.RefObject<HTMLElement>}
          className="!pointer-events-none !fixed !inset-0"
          dpr={[1, 2]}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.05;
          }}
        >
          <View.Port />
        </Canvas>
      )}
    </motion.section>
  );
}
