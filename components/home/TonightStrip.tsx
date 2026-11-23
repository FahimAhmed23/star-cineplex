"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { branches } from "@/lib/data";
import { demoDateFor, formatTime, localIso, nowHhmm } from "@/lib/demo-date";
import { useT } from "@/lib/i18n";
import type { Format } from "@/lib/types";

/** Minimal showtime row sent to the browser (no booked-seat lists). */
export interface ShowLite {
  id: string;
  branch: string;
  movie: string;
  date: string;
  time: string;
  format: Format;
}

const BRANCH_KEY = "sc-branch";
const DEFAULT_BRANCH = "bashundhara-city";

/**
 * "Tonight at" (CLAUDE.md §8.2): branch dropdown + a row of ticket-stub showtime chips.
 * The next upcoming show is purple; a click goes straight to seat selection for that show.
 */
export function TonightStrip({ shows, titles }: { shows: ShowLite[]; titles: Record<string, { en: string; bn: string | null }> }) {
  const { t, lang } = useT();
  const [branch, setBranch] = useState(DEFAULT_BRANCH);
  const [today, setToday] = useState<{ date: string; now: string } | null>(null);

  // client-only: the last-used branch and the local clock (avoids a hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BRANCH_KEY);
      if (saved && branches.some((b) => b.slug === saved)) setBranch(saved);
    } catch {}
    const tick = () => setToday({ date: demoDateFor(localIso()), now: nowHhmm() });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const pick = (slug: string) => {
    setBranch(slug);
    try {
      localStorage.setItem(BRANCH_KEY, slug);
    } catch {}
  };

  const list = useMemo(() => {
    if (!today) return [];
    return shows
      .filter((s) => s.branch === branch && s.date === today.date && s.time >= today.now)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [shows, branch, today]);

  const title = (slug: string) => {
    const m = titles[slug];
    return (lang === "bn" && m?.bn) || m?.en || slug;
  };

  return (
    <div className="tonight-strip relative border-t border-white/8 bg-[#0b0810]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-8">
        <div className="flex shrink-0 items-center gap-4">
          <span className="eyebrow !text-[14px]">
            <Icon name="star" size={16} />
            {t("hero.tonightAt")}
          </span>
          <label className="relative">
            <span className="sr-only">{t("hero.branchLabel")}</span>
            <select
              value={branch}
              onChange={(e) => pick(e.target.value)}
              className="focus-ring h-10 w-[248px] cursor-pointer appearance-none rounded-pill border border-white/15 bg-white/5 pr-10 pl-4 text-[14px] font-medium text-white transition-colors hover:border-white/30"
            >
              {branches.map((b) => (
                <option key={b.slug} value={b.slug} className="bg-[#0b0810]">
                  {lang === "bn" ? `${b.nameBn}, ${b.areaBn}` : `${b.name}, ${b.area.split(",")[0]}`}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
          </label>
        </div>

        <div className="relative min-w-0 flex-1">
          <ul
            aria-label={t("hero.tonightShows")}
            className="no-scrollbar flex items-center gap-3 overflow-x-auto py-2 pr-16 [mask-image:linear-gradient(to_right,#000_calc(100%-64px),transparent)]"
          >
            {today && list.length === 0 && <li className="text-[14px] text-muted">{t("hero.noShowsTonight")}</li>}
            {list.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <Link href={`/book/seats/${s.id}`} className={`ticket-chip focus-ring ${i === 0 ? "ticket-chip--next" : ""}`}>
                  <span className="ticket-chip__time">{formatTime(s.time)}</span>
                  <span className="ticket-chip__title">{title(s.movie)}</span>
                  <span className="ticket-chip__format">{s.format}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
