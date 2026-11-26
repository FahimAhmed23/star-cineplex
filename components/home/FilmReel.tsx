"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { branches } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { RevealText } from "@/components/ui/RevealText";

gsap.registerPlugin(ScrollTrigger);

/** light-leak placeholders until branch photos exist: each frame leaks from a different corner */
const LEAKS = ["0% 0%", "100% 0%", "0% 100%", "100% 100%", "50% 0%", "0% 50%", "100% 50%", "50% 100%", "0% 0%"];

/**
 * Branches — "The Film Reel" (CLAUDE.md §8.9): continues on night after Moments; the section pins and
 * vertical scroll pulls a 35mm strip right → left: one frame per branch, then an end frame with the logo.
 * The frame nearest the centre is bright and full size; the others dim to 50% and 0.96. Pure showcase.
 */
export function FilmReel() {
  const { t, lang } = useT();
  const section = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(true);
  const count = branches.length;

  useLayoutEffect(() => {
    const el = section.current;
    const band = strip.current;
    if (!el || !band) return;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPinned(false);
      return;
    }

    let last = -1;
    const focus = () => {
      const mid = innerWidth / 2;
      let best = 0;
      let bestD = Infinity;
      frames.current.forEach((f, i) => {
        if (!f) return;
        const r = f.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        const k = Math.max(0, 1 - d / (r.width + 16));
        f.style.setProperty("--k", k.toFixed(3));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== last) {
        last = best;
        setActive(best);
      }
    };

    const distance = () => band.scrollWidth - innerWidth;
    const tween = gsap.to(band, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
      onUpdate: focus,
    });
    focus();
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const shown = Math.min(active + 1, count);

  return (
    <section
      ref={section}
      id="branches"
      aria-labelledby="reel-title"
      className={`reel relative flex h-[100svh] min-h-[640px] flex-col overflow-hidden ${pinned ? "" : "is-static"}`}
    >
      <header className="relative z-10 mx-auto w-full max-w-[1280px] px-8 pt-[max(112px,13vh)]">
        <h2 id="reel-title" className="display-m text-white">
          <RevealText text={t("home.reelTitle")} />
        </h2>
        <RevealText as="p" className="mt-3 block text-[16px] text-muted" text={t("home.reelSub")} delay={0.35} stagger={0.04} />
      </header>

      {/* the 35mm strip */}
      <div className="flex flex-1 items-center">
        <div className="reel-scroller w-full">
          <div ref={strip} className="reel-strip">
            {branches.map((b, i) => {
              const name = (lang === "bn" && b.nameBn) || b.name;
              const area = (lang === "bn" && b.areaBn) || b.area;
              // placeholder copy (§8.9): only lines the designer has written show; Bangla from /locales
              const key = `home.reelLines.${b.slug}`;
              const line = b.reelLine ? (lang === "bn" && t(key) !== key ? t(key) : b.reelLine) : null;
              const n = String(i + 1).padStart(2, "0");
              return (
                <div
                  key={b.slug}
                  ref={(el) => {
                    frames.current[i] = el;
                  }}
                  className="reel-frame"
                  aria-label={`${n} ${name}, ${area}`}
                  role="group"
                >
                  <span aria-hidden className="reel-edge">STAR CINEPLEX 35MM ▸ {n}</span>
                  <div className="reel-picture">
                    <div className="reel-leak" style={{ ["--leak" as string]: LEAKS[i % LEAKS.length] }} />
                  </div>
                  <div className="reel-caption">
                    <span className="font-mono text-[13px] text-purple-light tabular-nums">{n}</span>
                    <h3 className="display-s mt-1 text-white">{name}</h3>
                    <p className="mt-1 text-[16px] text-muted">{area}</p>
                    {line && <p className="mt-3 text-[15px] text-paper/80">{line}</p>}
                  </div>
                  <span aria-hidden className="reel-edge reel-edge--bottom">{n}A</span>
                </div>
              );
            })}
            {/* end frame: the logo */}
            <div
              ref={(el) => {
                frames.current[count] = el;
              }}
              className="reel-frame reel-frame--end"
            >
              <span aria-hidden className="reel-edge">STAR CINEPLEX 35MM ▸ END</span>
              <div className="reel-picture grid place-items-center">
                <Image src="/brand/logo-white.png" alt="Star Cineplex" width={1200} height={499} className="h-auto w-[38%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {pinned && (
        <p className="absolute right-8 bottom-8 z-10 font-mono text-[14px] text-white/70 tabular-nums" aria-live="polite">
          {String(shown).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </p>
      )}
    </section>
  );
}
