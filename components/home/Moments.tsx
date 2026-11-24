"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

gsap.registerPlugin(ScrollTrigger);

/** §8.8 tile layout (desktop): x = % of viewport width, y = vh from the section top, speed = parallax factor. */
const TILES = [
  { src: "cosplay-duel", ratio: "3 / 2", focus: "50% 50%", w: 22, x: 4, y: 10, speed: 1.0 },
  { src: "spiderman-guests", ratio: "4 / 5", focus: "60% 70%", w: 14, x: 72, y: 4, speed: 1.3 },
  { src: "event-crowd", ratio: "3 / 4", focus: "30% 50%", w: 16, x: 80, y: 46, speed: 0.8 },
  { src: "red-carpet-group", ratio: "4 / 3", focus: "50% 50%", w: 20, x: 8, y: 62, speed: 1.2 },
  { src: "guest-lineup", ratio: "16 / 9", focus: "50% 50%", w: 24, x: 70, y: 92, speed: 1.0 },
  { src: "cosplay-duel", ratio: "3 / 4", focus: "15% 50%", w: 12, x: 2, y: 110, speed: 1.4 },
  { src: "spiderman-guests", ratio: "1 / 1", focus: "75% 45%", w: 13, x: 18, y: 140, speed: 0.7 },
  { src: "event-crowd", ratio: "3 / 2", focus: "50% 50%", w: 20, x: 76, y: 150, speed: 1.2 },
  { src: "red-carpet-group", ratio: "3 / 4", focus: "55% 50%", w: 14, x: 6, y: 175, speed: 0.9 },
  { src: "guest-lineup", ratio: "1 / 1", focus: "50% 75%", w: 15, x: 74, y: 200, speed: 1.3 },
] as const;

/**
 * "Moments made at Star Cineplex" (CLAUDE.md §8.8): the only light section on the home page — the house
 * lights come up (night → paper as it enters). A pinned logo + headline in the middle, real premiere photos
 * drifting past at different speeds on both sides; the centre column (34–66%) stays free. Nothing is clickable.
 */
export function Moments() {
  const { t } = useT();
  const section = useRef<HTMLElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const [lockupOn, setLockupOn] = useState(false);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // house lights: --t 0 → 1 while the section top travels the bottom 40vh of the viewport
    const lights = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "top 60%",
      scrub: true,
      onUpdate: (self) => el.style.setProperty("--t", self.progress.toFixed(3)),
      onLeaveBack: () => el.style.setProperty("--t", "0"),
    });
    // lights down again before the Film Reel (§8.9): --t2 0 → 1 while the section bottom travels the last 40vh,
    // so the reel starts on night with no visible edge
    const lightsDown = ScrollTrigger.create({
      trigger: el,
      start: "bottom bottom",
      end: "bottom 60%",
      scrub: true,
      onUpdate: (self) => el.style.setProperty("--t2", self.progress.toFixed(3)),
    });

    // the lockup fades in once the section reaches the middle of the viewport, out as it leaves
    const lockup = ScrollTrigger.create({
      trigger: el,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => setLockupOn(self.isActive),
    });

    // parallax: each tile moves (speed − 1) × the scroll distance on top of the normal scroll
    const parallax = reduced
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const d = self.scroll() - self.start - innerHeight;
            tiles.current.forEach((tile, i) => {
              if (tile) tile.style.transform = `translate3d(0, ${(-(TILES[i].speed - 1) * d).toFixed(1)}px, 0)`;
            });
          },
        });

    // tiles fade + scale in as they enter the viewport
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { rootMargin: "0px 0px -8% 0px" },
    );
    tiles.current.forEach((tile) => tile && io.observe(tile.firstElementChild!));

    return () => {
      lights.kill();
      lightsDown.kill();
      lockup.kill();
      parallax?.kill();
      io.disconnect();
    };
  }, []);

  return (
    <section ref={section} id="moments" aria-labelledby="moments-title" className="moments relative h-[260vh] overflow-clip">
      {/* pinned centre lockup */}
      <div className="pointer-events-none sticky top-0 z-10 flex h-[100svh] items-center justify-center">
        <div className={`moments-lockup flex flex-col items-center px-6 text-center ${lockupOn ? "is-on" : ""}`}>
          <Image src="/brand/logo.png" alt="Star Cineplex" width={1200} height={499} className="mb-6 h-auto w-[200px]" />
          <h2 id="moments-title" className="display-m max-w-[11ch] text-ink">
            {t("home.momentsTitle")}
          </h2>
        </div>
      </div>

      {/* the photo collage (decorative; nothing opens) */}
      <div aria-hidden className="absolute inset-0">
        {TILES.map((tile, i) => (
          <div
            key={i}
            ref={(el) => {
              tiles.current[i] = el;
            }}
            className="absolute will-change-transform"
            style={{ left: `${tile.x}vw`, top: `${tile.y}vh`, width: `${tile.w}vw` }}
          >
            <div className="moments-tile relative overflow-hidden" style={{ aspectRatio: tile.ratio }}>
              <Image
                src={`/moments/${tile.src}.webp`}
                alt=""
                fill
                sizes={`${tile.w}vw`}
                className="object-cover"
                style={{ objectPosition: tile.focus }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
