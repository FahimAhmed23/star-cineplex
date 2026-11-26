"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { RevealText } from "@/components/ui/RevealText";

gsap.registerPlugin(ScrollTrigger);

/**
 * §8.8 tile layout (desktop): x = % of viewport width, y = vh from the section top, speed = parallax factor.
 * Tiles sit in four lanes (two each side of the free centre column). Every lane has ONE speed, so tiles in a
 * lane never slide into each other, and the lanes never share horizontal space, so faster tiles pass slower
 * ones side by side instead of on top of them.
 *   left outer  x 2–18  · speed 0.85      left inner  x 21–32 · speed 1.25
 *   right inner x 67–79 · speed 1.3       right outer x 82–98 · speed 0.9
 */
const TILES = [
  { src: "cosplay-duel", ratio: "3 / 2", focus: "50% 50%", w: 16, x: 2, y: 10, speed: 0.85 },
  { src: "red-carpet-group", ratio: "4 / 3", focus: "50% 50%", w: 16, x: 2, y: 80, speed: 0.85 },
  { src: "guest-lineup", ratio: "1 / 1", focus: "50% 75%", w: 16, x: 2, y: 160, speed: 0.85 },
  { src: "cosplay-duel", ratio: "3 / 4", focus: "15% 50%", w: 11, x: 21, y: 44, speed: 1.25 },
  { src: "guest-lineup", ratio: "3 / 4", focus: "30% 50%", w: 11, x: 21, y: 100, speed: 1.25 },
  { src: "spiderman-guests", ratio: "1 / 1", focus: "75% 45%", w: 11, x: 21, y: 150, speed: 1.25 },
  { src: "spiderman-guests", ratio: "4 / 5", focus: "60% 70%", w: 12, x: 67, y: 6, speed: 1.3 },
  { src: "cosplay-duel", ratio: "4 / 5", focus: "70% 50%", w: 12, x: 67, y: 66, speed: 1.3 },
  { src: "red-carpet-group", ratio: "3 / 4", focus: "55% 50%", w: 12, x: 67, y: 125, speed: 1.3 },
  { src: "event-crowd", ratio: "3 / 4", focus: "30% 50%", w: 16, x: 82, y: 34, speed: 0.9 },
  { src: "guest-lineup", ratio: "16 / 9", focus: "50% 50%", w: 16, x: 82, y: 120, speed: 0.9 },
  { src: "event-crowd", ratio: "3 / 2", focus: "50% 50%", w: 16, x: 82, y: 185, speed: 0.9 },
] as const;

/**
 * "Moments made at Star Cineplex" (CLAUDE.md §8.8): a dark section — the lights go down after the light
 * Now Showing / Coming Soon sections (its top is a soft paper → night gradient, so there is no hard edge). A pinned logo + headline in the middle, real premiere photos
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
              if (tile) tile.style.transform = `translate3d(0, ${Math.round(-(TILES[i].speed - 1) * d)}px, 0)`;
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
          <Image src="/brand/logo-brand-dark.png" alt="Star Cineplex" width={1200} height={499} className="mb-6 h-auto w-[200px]" />
          <h2 id="moments-title" className="display-m max-w-[11ch] text-paper">
            <RevealText text={t("home.momentsTitle")} show={lockupOn} delay={0.25} />
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
                quality={90}
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
