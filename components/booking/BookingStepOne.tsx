"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { branches, movies } from "@/lib/data";
import { demoDateFor, localIso, nowHhmm, dateLocale } from "@/lib/demo-date";
import { markDoorsReady } from "@/lib/doors";
import { useT } from "@/lib/i18n";
import type { HallType, PriceTable } from "@/lib/types";
import { ExperienceCards } from "./ExperienceCards";
import { Stepper } from "./Stepper";
import { RevealText } from "@/components/ui/RevealText";
import { Dropdown } from "@/components/ui/Dropdown";

export interface ShowSlot {
  id: string;
  branch: string;
  hall: string;
  movie: string;
  date: string; // demo week date
  time: string;
  format: string;
  booked: number;
}

export interface HallInfo {
  id: string;
  name: string;
  type: HallType;
  branch: string;
  capacity: number;
  prices: PriceTable;
}

/** Bookable in this demo: Bashundhara City (its five halls are built from the real seat maps). */
export const DEMO_BRANCH = "bashundhara-city";
/** Today and the next 2 days (designer, Nov 27: starcineplex.com only sells a few days ahead). */
const BOOKABLE_DAYS = 3;

interface Day {
  real: string;
  demo: string;
  label: string;
  isToday: boolean;
}

/**
 * Step 1 — Branch · Date · Movie (CLAUDE.md §9.2), then "Choose your experience" (§9.3) slides in below on the
 * same page once all three are chosen. Dark theme.
 */
export function BookingStepOne({ slots, halls, initialMovie }: { slots: ShowSlot[]; halls: Record<string, HallInfo>; initialMovie: string | null }) {
  const { t, lang } = useT();
  const [branch, setBranch] = useState(DEMO_BRANCH);
  const [days, setDays] = useState<Day[] | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [movie, setMovie] = useState<string | null>(initialMovie);
  const [now, setNow] = useState("00:00");
  const experience = useRef<HTMLDivElement>(null);
  const moviesRow = useRef<HTMLDivElement>(null);
  const userPicked = useRef(false);

  // dates are computed in the browser (local "today"); the demo week maps onto the same weekdays
  useEffect(() => {
    const base = new Date();
    const list: Day[] = Array.from({ length: BOOKABLE_DAYS }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const real = localIso(d);
      return {
        real,
        demo: demoDateFor(real),
        isToday: i === 0,
        label: d.toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric" }),
      };
    });
    setDays(list);
    setNow(nowHhmm());
    markDoorsReady();
  }, [lang]);

  const day = days?.[dayIdx];
  // the day's shows at this branch; today hides the ones that have already started
  const daySlots = useMemo(
    () => (day ? slots.filter((s) => s.branch === branch && s.date === day.demo && (!day.isToday || s.time >= now)) : []),
    [slots, branch, day, now],
  );
  const dayMovies = useMemo(() => {
    const set = new Set(daySlots.map((s) => s.movie));
    return movies.filter((m) => set.has(m.slug));
  }, [daySlots]);

  const chosen = movie && dayMovies.some((m) => m.slug === movie) ? movie : null;
  const missing = movie && !chosen ? movies.find((m) => m.slug === movie) : null;

  // pre-filled movie: scroll its poster into view
  useEffect(() => {
    if (!days || !initialMovie) return;
    moviesRow.current?.querySelector(`[data-movie="${initialMovie}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [days, initialMovie]);

  // once branch, date and movie are chosen, glide down to "Choose your experience"
  useEffect(() => {
    if (!chosen || !experience.current) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => experience.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }), userPicked.current ? 120 : 600);
    return () => window.clearTimeout(id);
  }, [chosen, dayIdx, branch]);

  const pickMovie = (slug: string) => {
    userPicked.current = true;
    setMovie(slug);
  };

  return (
    <>
      <Navbar />
      {/* everything centred; content starts 60px below the navbar (strip 40 + tab 68 on desktop, tab 60 on phones) */}
      <main className="mx-auto max-w-[1280px] px-8 pt-[124px] pb-32 text-center max-md:px-5 lg:pt-[168px]">
        <Stepper step={1} className="justify-center" />
        <h1 className="display-m mt-8 mb-12 text-white">
          <RevealText text={t("booking.title")} show delay={0.1} />
        </h1>

        {/* 1. Branch */}
        {/* the branch/date card takes the width of the film row below it (designer, Nov 27): both sit in one grid
            that is as wide as the wider of the two */}
        <div className="mx-auto grid w-fit max-w-full max-md:w-full">
        {/* branch and date side by side */}
        <div className="pick-card mx-2 max-md:mx-0 grid grid-cols-[1fr_auto_1fr] max-md:grid-cols-1">
        <section aria-labelledby="pick-branch" className="px-10 py-7 max-md:px-6">
          <h2 id="pick-branch" className="mb-4 text-[24px] font-medium text-white">
            {t("booking.branch")}
          </h2>
          <Dropdown
            label={t("booking.branch")}
            value={branch}
            onChange={setBranch}
            size="lg"
            className="mx-auto w-[360px] max-w-full text-left"
            options={branches.map((b) => ({
              value: b.slug,
              label: lang === "bn" ? `${b.nameBn}, ${b.areaBn.split(",")[0]}` : `${b.name}, ${b.area.split(",")[0]}`,
              lang: lang === "bn" ? "bn" : undefined,
              disabled: b.slug !== DEMO_BRANCH,
              hint: b.slug !== DEMO_BRANCH ? t("booking.demoSoon") : undefined,
            }))}
          />
        </section>

        <span aria-hidden className="pick-card__divider" />

        {/* 2. Date */}
        <section aria-labelledby="pick-date" className="px-10 py-7 max-md:px-6">
          <h2 id="pick-date" className="mb-4 text-[24px] font-medium text-white">
            {t("booking.date")}
          </h2>
          <div className="date-chips no-scrollbar mx-auto flex w-fit max-w-full gap-2 overflow-x-auto">
            {(days ?? Array.from({ length: BOOKABLE_DAYS }, () => null)).map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => setDayIdx(i)}
                aria-pressed={i === dayIdx}
                className={`pick-pill focus-ring min-w-[92px] tabular-nums ${i === dayIdx ? "is-on" : ""}`}
              >
                {d ? (d.isToday ? t("booking.today") : d.label) : " "}
              </button>
            ))}
          </div>
        </section>
        </div>
        <p className="mt-3 mb-12 text-[13px] text-muted">{t("booking.demoOnly")}</p>

        {/* 3. Movie */}
        <section aria-labelledby="pick-movie" className="mb-6">
          <h2 id="pick-movie" className="mb-4 text-[24px] font-medium text-white">
            {t("booking.movie")}
          </h2>
          {days && dayMovies.length === 0 && <p className="text-[15px] text-muted">{t("booking.noShows")}</p>}
          <div ref={moviesRow} className="no-scrollbar flex items-start justify-[safe_center] gap-4 overflow-x-auto px-2 pt-2 pb-4 max-md:grid max-md:grid-cols-2 max-md:overflow-visible max-md:px-0">
            {dayMovies.map((m) => {
              const on = m.slug === chosen;
              return (
                <button
                  key={m.slug}
                  type="button"
                  data-movie={m.slug}
                  onClick={() => pickMovie(m.slug)}
                  aria-pressed={on}
                  className={`poster-pick focus-ring flex w-[140px] max-md:w-full shrink-0 flex-col text-left ${on ? "is-on" : ""}`}
                >
                  <span className="poster-pick__frame relative block aspect-[2/3] overflow-hidden rounded-card-sm">
                    <Image src={m.poster} alt="" fill sizes="140px" className="object-cover" />
                  </span>
                  <span className="mt-2 block text-[13px] font-medium text-white/85">{(lang === "bn" && m.titleBn) || m.title}</span>
                </button>
              );
            })}
          </div>
          {missing && <p className="text-[14px] text-muted">{t("booking.notPlaying", { movie: (lang === "bn" && missing.titleBn) || missing.title })}</p>}
        </section>
        </div>

        {/* §9.3 slides in once everything is chosen */}
        <div ref={experience} className="scroll-mt-28">
          {chosen && day && <ExperienceCards key={`${branch}-${day.demo}-${chosen}`} movie={chosen} slots={daySlots.filter((s) => s.movie === chosen)} halls={halls} />}
        </div>
      </main>
    </>
  );
}
