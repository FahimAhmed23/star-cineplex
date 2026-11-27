"use client";

import gsap from "gsap";
import { deviceNow } from "@/lib/device";
import { playSound } from "@/lib/sound";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useUi } from "@/lib/store";

/** played already in this page load? (a module flag: a refresh / new visit plays it again; moving between pages
 *  inside the site, e.g. back home from booking, doesn't) — designer, Nov 27 */
let playedThisLoad = false;
/** the logo is "born" by this point; the curtain may rise from here once the hall is ready */
const MIN_HOLD = 3.2;
/** past this, the curtain rises as soon as the hall is ready (it never rises on an empty hall) */
const MAX_HOLD = 5;

/**
 * "Curtain Up" opening (CLAUDE.md §8.1, designer Nov 27) — it doubles as the page loader:
 * a purple velvet curtain fills the screen → a projector light warms up in its middle → the Star Cineplex logo is
 * born inside the light → while the 3D hall and first trailer load, it holds (the light breathes) → the whole curtain
 * rises in one piece, bottom first edge leading → the hall shows, then the navbar, the hero text and "Tonight at".
 * 3.2–5s, skippable (button or Escape), on every page load (refresh included).
 */
export function OpeningSequence() {
  const { t } = useT();
  const setStage = useUi((s) => s.setStage);
  const hallReady = useUi((s) => s.hallReady);
  const [show, setShow] = useState<boolean | null>(null); // null = not decided yet (SSR / first paint)
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const waiting = useRef(false);
  const breathe = useRef<gsap.core.Tween | null>(null);
  const started = useRef(0);

  // every page load (refresh included); not again when coming back home from another page of the site
  useLayoutEffect(() => {
    let seen = playedThisLoad;
    try {
      // a shared trailer link (/?trailer=…) goes straight to the Trailer view (§8.7)
      if (new URLSearchParams(location.search).has("trailer")) seen = true;
    } catch {}
    setShow(!seen);
    if (seen) setStage("revealed");
  }, [setStage]);

  const finish = useCallback(() => {
    playedThisLoad = true;
    setShow(false);
  }, []);

  const skip = useCallback(() => {
    tl.current?.kill();
    breathe.current?.kill();
    playedThisLoad = true;
    setStage("revealed");
    if (root.current) gsap.to(root.current, { opacity: 0, duration: 0.35, ease: "none", onComplete: () => setShow(false) });
    else setShow(false);
  }, [setStage]);

  // build the timeline
  useEffect(() => {
    if (!show || !root.current) return;
    const el = root.current;
    const q = gsap.utils.selector(el);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    started.current = performance.now();

    // hold point: wait for the hall (and at least MIN_HOLD); past MAX_HOLD rise the moment it's ready
    const holdIfLoading = (tlx: gsap.core.Timeline) => {
      if (useUi.getState().hallReady) return;
      tlx.pause();
      waiting.current = true;
      if (!reduced)
        breathe.current = gsap.to(q(".op-light"), { "--light": 0.82, duration: 1.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
    };

    if (reduced) {
      // no rise, no growth: the logo shows on the lit curtain, then everything fades into the hall
      gsap.set(q(".op-light"), { "--light": 1, "--r": "30vmax" });
      gsap.set(q(".op-logo"), { opacity: 1 });
      const t2 = gsap.timeline();
      t2.call(() => holdIfLoading(t2), [], 1.2);
      t2.call(() => setStage("revealed"), [], 1.25);
      t2.to(el, { opacity: 0, duration: 0.6, ease: "none" }, 1.25);
      t2.call(finish);
      tl.current = t2;
      return () => {
        t2.kill();
      };
    }

    const t1 = gsap.timeline();
    // 1. the curtain fades up out of black (0–0.5s)
    t1.fromTo(q(".op-curtain"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "none" }, 0);
    // 2. the projector light warms up in the middle (0.6–1.7s): the lit copy of the velvet shows through a growing
    //    soft ellipse, so the folds catch the light; a faint flicker as the lamp settles
    t1.call(() => playSound("projector"), [], 0.6);
    t1.fromTo(q(".op-light"), { "--r": "0vmax", "--light": 0 }, { "--r": "30vmax", "--light": 1, duration: 1.1, ease: EASE_OUT }, 0.6);
    t1.to(q(".op-light"), { "--light": 0.88, duration: 0.07, yoyo: true, repeat: 3, ease: "none" }, 1.0);
    // 3. the logo is born in the light (1.3–2.6s): a flare blooms, the logo resolves out of a blur and settles
    t1.fromTo(q(".op-flare"), { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.55, ease: EASE_OUT }, 1.3);
    t1.to(q(".op-flare"), { opacity: 0.35, scale: 1.25, duration: 0.9, ease: "sine.out" }, 1.85);
    t1.fromTo(
      q(".op-logo"),
      { opacity: 0, scale: 0.86, filter: "blur(14px) brightness(2.2)" },
      { opacity: 1, scale: 1, filter: "blur(0px) brightness(1)", duration: 1.2, ease: EASE_OUT },
      1.45,
    );
    // 4. loader hold: from MIN_HOLD the curtain rises once the hall is ready (the light breathes while it waits)
    t1.call(() => holdIfLoading(t1), [], MIN_HOLD);
    // 5. the curtain rises as one piece (≈1.5s); the light and logo fade as it lifts
    const R = MIN_HOLD + 0.05;
    t1.to(q(".op-glow, .op-flare"), { opacity: 0, duration: 0.5, ease: "none" }, R);
    t1.to(q(".op-logo"), { opacity: 0, duration: 0.7, ease: "none" }, R + 0.2);
    t1.to(q(".op-rise"), { yPercent: -112, duration: 1.5, ease: EASE_IN_OUT }, R);
    t1.call(() => playSound("doors"), [], R);
    // 6. the hall shows first, then the navbar + hero text + "Tonight at" follow in order (HallHero / Navbar delays)
    t1.call(() => setStage("revealed"), [], R + 1.25);
    t1.call(finish, [], R + 1.55);
    if (deviceNow().phone) t1.timeScale(1.2); // §11: a little shorter on phones
    tl.current = t1;
    return () => {
      t1.kill();
      breathe.current?.kill();
    };
  }, [show, finish, setStage]);

  // the hall became ready while we were holding → rise now
  useEffect(() => {
    if (!hallReady || !waiting.current || !tl.current || !root.current) return;
    waiting.current = false;
    breathe.current?.kill();
    gsap.to(root.current.querySelectorAll(".op-light"), { "--light": 1, duration: 0.25 });
    tl.current.play();
  }, [hallReady]);

  // safety: never hold the visitor longer than MAX_HOLD once the hall is ready (also covers a missed ready event)
  useEffect(() => {
    if (!show) return;
    const id = window.setInterval(() => {
      if (waiting.current && useUi.getState().hallReady && (performance.now() - started.current) / 1000 > MAX_HOLD) {
        waiting.current = false;
        breathe.current?.kill();
        tl.current?.play();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [show]);

  // Escape skips (§10 Keyboard)
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, skip]);

  if (show === null) return <div className="fixed inset-0 z-[60] bg-night" aria-hidden />; // no flash of the hero before we know
  if (!show) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-label={t("intro.label")} aria-live="off">
      {/* everything that rises with the curtain */}
      <div className="op-rise absolute inset-0 will-change-transform">
        {/* the velvet, dim (house lights down) */}
        <div className="op-curtain absolute inset-0 bg-night">
          <div className="op-velvet op-velvet--dim" />
          {/* the same velvet, lit, seen through the projector's soft ellipse */}
          <div className="op-light op-velvet op-velvet--lit" />
          {/* the light's own glow on the fabric */}
          <div className="op-light op-glow" />
          {/* the hem's shadow on the hall as the curtain lifts */}
          <div className="op-hem-shadow" />
        </div>
        {/* the logo, born in the light */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="op-flare" aria-hidden />
          {/* projected: a soft glow around the white logo (on a wrapper, so the "born" blur can animate the logo's own filter) */}
          <span className="op-logo-glow relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.png" alt="Star Cineplex" className="op-logo block w-[min(34vw,440px)] opacity-0 max-md:w-[62vw]" />
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={skip}
        className="focus-ring absolute right-6 bottom-6 z-10 flex items-center gap-1 rounded-pill bg-black/30 px-3 py-2 text-[13px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:text-white"
      >
        {t("intro.skip")}
        <Icon name="altArrowRight" size={16} />
      </button>
    </div>
  );
}
