"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { branches, getHall } from "@/lib/data";
import { demoDateFor, formatTime, localIso, nowHhmm } from "@/lib/demo-date";
import { useDoors } from "@/lib/doors";
import { useT } from "@/lib/i18n";
import type { Format } from "@/lib/types";
import { Dropdown } from "@/components/ui/Dropdown";

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
 * Chips run in the trailer carousel's order (then by time). The chip of the film whose trailer is playing is purple,
 * and the row glides sideways to it whenever the trailer changes. A click goes straight to seat selection.
 */
export function TonightStrip({
  shows,
  titles,
  order = [],
  current,
}: {
  shows: ShowLite[];
  titles: Record<string, { en: string; bn: string | null }>;
  /** the trailer carousel's film order (slugs) */
  order?: string[];
  /** the film whose trailer is playing now */
  current?: string;
}) {
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
      .sort((a, b) => {
        const ra = order.indexOf(a.movie), rb = order.indexOf(b.movie);
        const oa = ra < 0 ? order.length : ra, ob = rb < 0 ? order.length : rb;
        return oa - ob || a.time.localeCompare(b.time);
      });
  }, [shows, branch, today, order]);

  // the active chip: the playing film's next show (no trailer info → the first chip)
  const activeId = (current ? list.find((s) => s.movie === current) : list[0])?.id;

  // glide the row (sideways only — the page never jumps) so the active chip sits at the start
  const row = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = row.current;
    const li = activeId ? (ul?.querySelector(`[data-show="${activeId}"]`) as HTMLElement | null) : null;
    if (!ul || !li) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    ul.scrollTo({ left: li.offsetLeft - ul.offsetLeft - (ul.firstElementChild as HTMLElement).offsetLeft, behavior: reduced ? "auto" : "smooth" });
  }, [activeId]);

  // a chip goes straight to seat selection, through the cinema doors (§9.1, §9.4)
  const router = useRouter();
  const go = useDoors((st) => st.go);
  const enter = (s: ShowLite) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // new tab: plain link
    e.preventDefault();
    const hall = getHall(s.id.replace(/-\d{8}-\d{4}$/, ""));
    go(`/book/seats/${s.id}`, { hall: (hall?.name ?? "").toUpperCase(), line: `${title(s.movie)} · ${formatTime(s.time)}` }, router.push);
  };

  const title = (slug: string) => {
    const m = titles[slug];
    return (lang === "bn" && m?.bn) || m?.en || slug;
  };

  return (
    <div className="tonight-strip relative border-t border-white/8 bg-[#0b0810]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] gap-3 px-5 py-3 max-md:flex-col md:h-[72px] md:items-center md:gap-6 md:px-8 md:py-0">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <span className="eyebrow !text-[14px]">
            <Icon name="star" size={16} />
            {t("hero.tonightAt")}
          </span>
          {/* themed list, opening upward (the strip sits at the bottom of the hero) */}
          <Dropdown
            label={t("hero.branchLabel")}
            value={branch}
            onChange={pick}
            placement="up"
            className="w-[200px] md:w-[248px]"
            options={branches.map((b) => ({
              value: b.slug,
              label: lang === "bn" ? `${b.nameBn}, ${b.areaBn}` : `${b.name}, ${b.area.split(",")[0]}`,
              short: lang === "bn" ? b.nameBn : b.name, // phones: just the name, never cut off
              lang: lang === "bn" ? "bn" : undefined,
            }))}
          />
        </div>

        <div className="relative min-w-0 flex-1">
          <ul
            ref={row}
            aria-label={t("hero.tonightShows")}
            className="no-scrollbar flex snap-x items-center gap-3 overflow-x-auto py-2 pr-16 max-md:-mx-5 max-md:px-5 [mask-image:linear-gradient(to_right,#000_calc(100%-64px),transparent)] [&>li]:snap-start"
          >
            {today && list.length === 0 && <li className="text-[14px] text-muted">{t("hero.noShowsTonight")}</li>}
            {list.map((s) => (
              <li key={s.id} data-show={s.id} className="shrink-0">
                <a
                  href={`/book/seats/${s.id}`}
                  onClick={enter(s)}
                  aria-current={s.id === activeId ? "true" : undefined}
                  className={`ticket-chip focus-ring ${s.id === activeId ? "ticket-chip--next" : ""}`}
                >
                  <span className="ticket-chip__time">{formatTime(s.time)}</span>
                  <span className="ticket-chip__title">{title(s.movie)}</span>
                  <span className="ticket-chip__format">{s.format}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
