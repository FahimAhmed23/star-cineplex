"use client";

// Phase 0 test page: tokens, fonts, icons, buttons, language toggle and a data summary.
// Internal page for the designer to check the foundations; not part of the case-study flow.
import Image from "next/image";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ICONS } from "@/components/ui/icons.generated";
import { useLang, useT } from "@/lib/i18n";
import { buildSeats } from "@/lib/halls";
import type { Hall, Movie } from "@/lib/types";
import hallsData from "@/data/halls.json";
import moviesData from "@/data/movies.json";
import branchesData from "@/data/branches.json";

const halls = hallsData.halls as Hall[];
const movies = moviesData.movies as Movie[];

const COLORS = [
  ["--purple", "#7F3E98"],
  ["--purple-light", "#B784D6"],
  ["--paper", "#FAF9F5"],
  ["--ink", "#231F20"],
  ["--night", "#121015"],
  ["--muted", "#A59CB0"],
  ["--gold", "#F5B72E"],
  ["--imdb", "#F5C518"],
] as const;
const MAP = [
  ["Premium", "--map-premium"],
  ["Semi-Recliner", "--map-semi-recliner"],
  ["VIP", "--map-vip"],
  ["Booked", "--map-booked"],
  ["Selected", "--map-selected"],
] as const;

function Section({ title, children, light }: { title: string; children: React.ReactNode; light?: boolean }) {
  return (
    <section className={`px-8 py-16 ${light ? "theme-light" : ""}`}>
      <div className="mx-auto max-w-[1280px]">
        <h2 className={`mb-8 text-[13px] font-medium ${light ? "text-ink/60" : "text-muted"}`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function Styleguide() {
  const { t, lang } = useT();
  const setLang = useLang((s) => s.setLang);
  const [loading, setLoading] = useState(false);

  return (
    <main>
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-6">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <Image src="/brand/logo-white.png" alt="Star Cineplex" width={1200} height={499} className="h-7 w-auto" priority />
          <div className="flex items-center gap-2 text-[13px]" role="group" aria-label={t("common.language")}>
            <Icon name="globe" size={14} className="text-muted" />
            <button onClick={() => setLang("en")} className={lang === "en" ? "text-white underline underline-offset-4" : "text-muted hover:text-white"} aria-pressed={lang === "en"}>
              EN
            </button>
            <span className="text-muted">/</span>
            <button onClick={() => setLang("bn")} lang="bn" className={`font-bangla ${lang === "bn" ? "text-white underline underline-offset-4" : "text-muted hover:text-white"}`} aria-pressed={lang === "bn"}>
              বাংলা
            </button>
          </div>
        </div>
      </header>

      {/* Type */}
      <Section title="Typography — GC Movark 500 · Geist · Anek Bangla · IBM Plex Mono">
        <p className="eyebrow mb-4">
          <Icon name="star" size={16} />
          {t("hero.eyebrow")}
        </p>
        <p className="display-xl">Japito Jibon</p>
        <p className="display-l mt-10">{t("footer.headline1")}</p>
        <p className="display-m mt-10">{t("home.nowShowingTitle")}</p>
        <p className="display-s mt-10">your seat is waiting.</p>
        <div className="mt-10 grid max-w-3xl gap-4">
          <p className="body-l text-white/85">
            body-l 16/1.55 — A family&apos;s quiet life is tested as history moves through their home. The synopsis runs to three lines at most, then ends.
          </p>
          <p className="body text-white/85">body 15/1.5 — Geist for everything users click or read in detail.</p>
          <p className="text-ui">ui 14/600 — {t("common.buyTickets")} · {t("common.fullSchedule")}</p>
          <p className="caption text-muted">caption 12.5 — {t("footer.iconCredit")}</p>
          <p className="mono text-purple-light">E07 · E08 · SC-BDC1-7Q2K · 09:42</p>
          <p lang="bn" className="font-bangla text-[20px] font-semibold">হলের সেরা আসনটি আপনার অপেক্ষায়। ৳৬৫০</p>
        </div>
      </Section>

      {/* Colours */}
      <Section title="Colour tokens">
        <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
          {COLORS.map(([name, hex]) => (
            <div key={name}>
              <div className="h-20 rounded-card-sm border border-white/10" style={{ background: `var(${name})` }} />
              <p className="mt-2 text-[13px] font-medium">{name}</p>
              <p className="mono text-muted">{hex}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 mb-4 text-[13px] text-muted">2D seat map</p>
        <div className="flex flex-wrap gap-6">
          {MAP.map(([label, v]) => (
            <div key={label} className="flex items-center gap-2 text-[13px]">
              <span className="h-5 w-5 rounded-md" style={{ background: `var(${v})`, outline: v === "--map-booked" ? "1px solid rgba(255,255,255,.12)" : undefined }} />
              {label}
            </div>
          ))}
        </div>
      </Section>

      {/* Radius */}
      <Section title="Radius — buttons are pills; cards 20 / 24 / 32px by size">
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["rounded-card-sm", "20px · small cards, tiles, popups", "h-28 w-44"],
            ["rounded-card-md", "24px · movie, hall-type, payment cards", "h-44 w-64"],
            ["rounded-card-lg", "32px · ticket, summary, panels", "h-56 w-96"],
          ].map(([cls, label, size]) => (
            <div key={cls}>
              <div className={`${cls} ${size} glass border border-white/10`} />
              <p className="mt-2 text-[13px] font-medium">{cls}</p>
              <p className="caption text-muted">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Buttons dark */}
      <Section title="Buttons — centre fill (hover, focus with Tab, press). Primary · Secondary · small · disabled · loading">
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink href="/styleguide" icon="ticket">{t("common.buyTickets")}</ButtonLink>
          <Button variant="secondary" icon="calendar">{t("common.fullSchedule")}</Button>
          <Button icon="play">{t("common.playTrailer")}</Button>
          <Button size="sm" variant="secondary">{t("common.showAll", { count: 12 })}</Button>
          <Button size="sm" variant="secondary" icon="arrowLeft">{t("common.back")}</Button>
          <Button disabled>{t("common.continue")}</Button>
          <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
            {t("common.continue")}
          </Button>
        </div>
      </Section>

      {/* Buttons light */}
      <Section light title="Light theme (checkout & ticket) — Primary (light)">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary-light">{t("checkout.pay", { amount: "1,300" })}</Button>
          <Button variant="primary-light" icon="download">{t("ticket.save")}</Button>
          <Button variant="primary-light" loading>{t("checkout.pay", { amount: "1,300" })}</Button>
        </div>
      </Section>

      {/* Icons */}
      <Section title={`Icons — Solar (${Object.keys(ICONS).length} verified names). Linear · Bold · Bold Duotone (--purple + --purple-light)`}>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-10">
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <div key={name} className="flex flex-col items-center gap-2 rounded-card-sm border border-white/10 px-2 py-4">
              <Icon name={name} size={ICONS[name].endsWith("duotone") ? 32 : 24} />
              <span className="caption text-center text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Data */}
      <Section title="Data — /data (validated by npm run validate:data)">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <table className="w-full text-left text-[14px]">
            <thead className="text-muted">
              <tr><th className="py-2 font-medium">Hall</th><th className="font-medium">Type</th><th className="text-right font-medium">Seats</th></tr>
            </thead>
            <tbody>
              {halls.filter((h) => h.branch === "bashundhara-city").map((h) => (
                <tr key={h.id} className="border-t border-white/10">
                  <td className="py-2">Bashundhara {h.name}{h.approx && <span className="text-muted"> · approx</span>}</td>
                  <td className="capitalize">{h.type}</td>
                  <td className="mono text-right">{buildSeats(h).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="mb-3 text-[14px] text-muted">{branchesData.branches.length} branches · {movies.length} movies</p>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-9">
              {movies.map((m) => (
                <figure key={m.slug}>
                  <Image src={m.poster} alt={m.title} width={300} height={450} className="aspect-[2/3] w-full rounded-card-sm object-cover" />
                  <figcaption className="caption mt-1 truncate text-muted">{m.status === "coming-soon" ? "Soon" : "Now"}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Trailers */}
      <Section title="Trailers — /public/trailers (720p H.264, under 8MB, poster frame until playable)">
        <div className="grid gap-4 sm:grid-cols-3">
          {movies.slice(0, 3).map((m) => (
            <video key={m.slug} src={m.trailer} poster={m.trailerPoster} controls muted preload="none" className="aspect-video w-full rounded-card-md bg-black" />
          ))}
        </div>
      </Section>

      <footer className="border-t border-white/10 px-8 py-8">
        <div className="caption mx-auto flex max-w-[1280px] flex-wrap justify-between gap-2 text-muted">
          <span>{t("footer.copyright")}</span>
          <span>{t("footer.iconCredit")}</span>
        </div>
      </footer>
    </main>
  );
}
