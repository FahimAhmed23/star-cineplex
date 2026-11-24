"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { branches, halls, hallName } from "@/lib/data";
import { demoDateFor, localIso, nowHhmm } from "@/lib/demo-date";
import { priceBandFor } from "@/lib/halls";
import { useT } from "@/lib/i18n";
import { usePanels } from "@/lib/panels";
import type { Hall, PriceBand, SeatClass } from "@/lib/types";
import { SlideOver } from "./SlideOver";

const BANDS: PriceBand[] = ["matinee", "evening", "weekend"];
const CLASS_KEY: Record<SeatClass, string> = { premium: "booking.classPremium", "semi-recliner": "booking.classSemiRecliner", vip: "booking.classVip" };
const HALL_KEY: Record<Hall["type"], string> = { premium: "booking.hallPremium", vip: "booking.hallVip", atmos: "booking.hallAtmos" };

/** "Hall 1, Hall 2, Hall 3" → "Halls 1–3" */
function hallLabel(group: Hall[], t: (k: string, v?: Record<string, string>) => string, lang: string) {
  const nums = group.map((h) => Number(h.name.replace(/\D/g, ""))).sort((a, b) => a - b);
  if (nums.length === 1) return hallName(group[0], lang);
  const run = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return t("prices.halls", { list: run ? `${nums[0]}–${nums[nums.length - 1]}` : nums.join(", ") });
}

/** §7 Prices: a slide-over with the price table for one branch, the time-band rules and the source. */
export function PricesPanel() {
  const { t, lang } = useT();
  const { open, close } = usePanels();
  const [branch, setBranch] = useState("bashundhara-city");
  const now = useMemo(() => (open === "prices" ? priceBandFor(demoDateFor(localIso()), nowHhmm()) : null), [open]);

  // halls with the same type and the same price table share a row group
  const groups = useMemo(() => {
    const m = new Map<string, Hall[]>();
    halls.filter((h) => h.branch === branch).forEach((h) => {
      const k = `${h.type}|${JSON.stringify(h.prices)}`;
      m.set(k, [...(m.get(k) ?? []), h]);
    });
    return [...m.values()];
  }, [branch]);

  return (
    <SlideOver open={open === "prices"} onClose={close} title={t("prices.title")} width={560}>
      <label className="block">
        <span className="text-[13px] text-muted">{t("prices.branch")}</span>
        <span className="relative mt-2 block">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="focus-ring h-11 w-full appearance-none rounded-pill border border-white/15 bg-white/5 pr-10 pl-4 text-[15px] text-white">
            {branches.map((b) => (
              <option key={b.slug} value={b.slug} className="bg-[#0b0810]">
                {(lang === "bn" && b.nameBn) || b.name}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
        </span>
      </label>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <caption className="sr-only">{t("prices.caption")}</caption>
          <thead>
            <tr className="text-[12px] text-muted">
              <th scope="col" className="pb-3 font-medium">{t("prices.seat")}</th>
              {BANDS.map((b) => (
                <th key={b} scope="col" className={`px-2 pb-3 text-right font-medium ${now === b ? "text-purple-light" : ""}`}>
                  {t(`prices.band.${b}`)}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g[0].id} className="border-t border-white/10">
              <tr>
                <th colSpan={4} scope="colgroup" className="pt-4 pb-2 text-[13px] font-semibold text-white">
                  {hallLabel(g, t, lang)} <span className="font-normal text-muted">· {t(HALL_KEY[g[0].type])}</span>
                </th>
              </tr>
              {(Object.keys(g[0].prices) as SeatClass[]).map((c) => (
                <tr key={c}>
                  <th scope="row" className="py-2 font-normal text-white/80">{t(CLASS_KEY[c])}</th>
                  {BANDS.map((b) => (
                    <td key={b} className={`px-2 py-2 text-right tabular-nums ${now === b ? "rounded-[8px] bg-purple/25 font-semibold text-white" : "text-white/80"}`}>
                      ৳{g[0].prices[c]![b]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {now && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-purple-light">
          <Icon name="clock" size={16} />
          {t("prices.now", { band: t(`prices.band.${now}`) })}
        </p>
      )}

      <h3 className="mt-8 text-[14px] font-semibold">{t("prices.rulesTitle")}</h3>
      <ul className="mt-3 space-y-2 text-[14px] text-white/75">
        {BANDS.map((b) => (
          <li key={b} className="flex gap-3">
            <span className="w-[136px] shrink-0 text-white">{t(`prices.band.${b}`)}</span>
            {t(`prices.rule.${b}`)}
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-8 text-[12px] text-muted">{t("prices.source")}</p>
    </SlideOver>
  );
}
