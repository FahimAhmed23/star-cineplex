"use client";

import gsap from "gsap";
import { playSound } from "@/lib/sound";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { useUi } from "@/lib/store";

const SEEN_KEY = "sc-intro-seen";

/**
 * "House Lights Down" opening (CLAUDE.md §8.1), a 2D overlay above the 3D hall:
 * darkness → two projector beams from the bottom corners → the logo panel lights up → the screen splits
 * through the panel (top half up, bottom half down) to reveal the hall. ≈3.2s, skippable, once per session.
 * Composition from references/opening-projector-beams.png (2000 × 1125 artboard).
 */
export function OpeningSequence() {
  const { t } = useT();
  const setStage = useUi((s) => s.setStage);
  const hallReady = useUi((s) => s.hallReady);
  const [show, setShow] = useState<boolean | null>(null); // null = not decided yet (SSR / first paint)
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const waiting = useRef(false);
  const pulse = useRef<gsap.core.Tween | null>(null);

  // once per session; returning visitors go straight to the hero's final state
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      // a shared trailer link (/?trailer=…) goes straight to the Trailer view (§8.7)
      if (new URLSearchParams(location.search).has("trailer")) seen = true;
    } catch {}
    setShow(!seen);
    if (seen) setStage("revealed");
  }, [setStage]);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setStage("revealed");
    setShow(false);
  }, [setStage]);

  const skip = useCallback(() => {
    tl.current?.kill();
    pulse.current?.kill();
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setStage("revealed");
    if (root.current) gsap.to(root.current, { opacity: 0, duration: 0.3, ease: "none", onComplete: () => setShow(false) });
    else setShow(false);
  }, [setStage]);

  // build the timeline
  useEffect(() => {
    if (!show || !root.current) return;
    const q = gsap.utils.selector(root.current);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // skip beams + split: fade from black to the hall in 600ms
      q(".op-art").forEach((el) => ((el as HTMLElement).style.display = "none"));
      const t2 = gsap.timeline();
      t2.call(() => {
        if (!useUi.getState().hallReady) {
          t2.pause();
          waiting.current = true;
        }
      }, [], 0.2);
      t2.call(() => setStage("revealed"), [], 0.25);
      t2.to(root.current, { opacity: 0, duration: 0.6, ease: "none" }, 0.25);
      t2.call(finish);
      tl.current = t2;
      return () => {
        t2.kill();
      };
    }

    const t1 = gsap.timeline();
    // 1. darkness 0–0.3s (nothing to do)
    // 2. projector beams grow from the corners 0.3–1.2s
    // (each half of the split is its own copy of the artwork, so every tween targets both copies)
    // (CSS transitions on the SVG groups: transform-box: view-box keeps the corner origins in artboard units)
    t1.call(() => {
      q(".op-beam").forEach((el) => el.classList.add("is-on"));
      playSound("projector");
    }, [], 0.3);
    t1.fromTo(q(".op-dust"), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "none" }, 0.6);
    // 3. the panel lights up 0.6–1.6s, the logo fades in on it (projected, with a slight glow)
    t1.fromTo(q(".op-panel"), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: EASE_OUT }, 0.6);
    t1.fromTo(q(".op-logo"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: EASE_OUT }, 1.0);
    // hold ~0.4s, then wait for the hall if it isn't ready (pulse the panel meanwhile)
    t1.call(() => {
      if (!useUi.getState().hallReady) {
        t1.pause();
        waiting.current = true;
        pulse.current = gsap.to(q(".op-panel"), { opacity: 0.75, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    }, [], 1.8);
    // 4. split reveal 1.8–2.6s: top half up, bottom half down, through the middle of the panel
    t1.to(q(".op-top"), { yPercent: -52, duration: 0.8, ease: EASE_IN_OUT }, 1.8);
    t1.to(q(".op-bottom"), { yPercent: 52, duration: 0.8, ease: EASE_IN_OUT }, 1.8);
    // 5. hall arrival: navbar + hero info come in as the halves open (≈2.2s)
    t1.call(() => setStage("revealed"), [], 2.1);
    t1.call(finish, [], 2.65);
    tl.current = t1;
    return () => {
      t1.kill();
      pulse.current?.kill();
    };
  }, [show, finish, setStage]);

  // the hall became ready while we were holding on the logo panel → carry on
  useEffect(() => {
    if (hallReady && waiting.current && tl.current) {
      waiting.current = false;
      pulse.current?.kill();
      if (root.current) gsap.to(root.current.querySelectorAll(".op-panel"), { opacity: 1, duration: 0.2 });
      tl.current.play();
    }
  }, [hallReady]);

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
    <div ref={root} className="fixed inset-0 z-[60]" role="dialog" aria-label={t("intro.label")} aria-live="off">
      {/* the two halves are clipped copies of the same artwork, so the split cuts straight through the panel */}
      <div className="op-top absolute inset-0 [clip-path:inset(0_0_calc(50%-1px)_0)]">
        <Artwork />
      </div>
      <div className="op-bottom absolute inset-0 [clip-path:inset(50%_0_0_0)]">
        <Artwork />
      </div>
      <button
        type="button"
        onClick={skip}
        className="focus-ring absolute right-6 bottom-6 z-10 flex items-center gap-1 rounded-pill px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-white"
      >
        {t("intro.skip")}
        <Icon name="altArrowRight" size={16} />
      </button>
    </div>
  );
}

/** Beams + panel + logo, drawn on the reference's 2000 × 1125 artboard and scaled to cover the viewport. */
function Artwork() {
  return (
    <div className="absolute inset-0 bg-night">
      <svg className="op-art absolute inset-0 h-full w-full" viewBox="0 0 2000 1125" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="beamL" x1="0" y1="1110" x2="830" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="0.55" stopColor="#d9c6f0" stopOpacity="0.3" />
            <stop offset="1" stopColor="#b784d6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="beamR" x1="2000" y1="1110" x2="1170" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
            <stop offset="0.55" stopColor="#d9c6f0" stopOpacity="0.3" />
            <stop offset="1" stopColor="#b784d6" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="panelGlow" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#f6f2fb" />
            <stop offset="1" stopColor="#d8cfe6" />
          </radialGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="glow" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="40" />
          </filter>
          <filter id="logoGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="beamClipL">
            <polygon points="0,1110 732,548 940,778" />
          </clipPath>
          <clipPath id="beamClipR">
            <polygon points="2000,1110 1268,548 1060,778" />
          </clipPath>
        </defs>

        {/* soft halo behind the panel */}
        <rect className="op-panel" x="640" y="380" width="720" height="364" rx="40" fill="#b784d6" fillOpacity="0.45" opacity="0" filter="url(#glow)" />
        {/* the centre panel (29% of the width, ≈2.1:1) */}
        <rect className="op-panel" x="709" y="423" width="582" height="278" rx="6" fill="url(#panelGlow)" opacity="0" />
        {/* Star Cineplex logo, projected onto the panel */}
        <image className="op-logo" href="/brand/logo.png" x="790" y="480" width="420" height="175" preserveAspectRatio="xMidYMid meet" opacity="0" filter="url(#logoGlow)" />

        {/* two projector beams from the bottom corners, blurred edges */}
        <g className="op-beam op-beam-l">
          <polygon points="0,1110 732,548 940,778" fill="url(#beamL)" filter="url(#soft)" />
          <g clipPath="url(#beamClipL)" className="op-dust" opacity="0">
            <Dust seed={1} from={[0, 1110]} to={[836, 663]} />
          </g>
        </g>
        <g className="op-beam op-beam-r">
          <polygon points="2000,1110 1268,548 1060,778" fill="url(#beamR)" filter="url(#soft)" />
          <g clipPath="url(#beamClipR)" className="op-dust" opacity="0">
            <Dust seed={2} from={[2000, 1110]} to={[1164, 663]} />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Subtle floating dust inside a beam (deterministic positions; CSS drift). */
function Dust({ seed, from, to }: { seed: number; from: [number, number]; to: [number, number] }) {
  const motes = Array.from({ length: 26 }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(seed * 999 + i * 91.7 + n * 13.3) * 10000;
      return x - Math.floor(x);
    };
    const t = 0.15 + r(1) * 0.8;
    const spread = (r(2) - 0.5) * 220 * (1 - t);
    return {
      cx: from[0] + (to[0] - from[0]) * t + spread * 0.6,
      cy: from[1] + (to[1] - from[1]) * t + spread,
      r: 1.2 + r(3) * 2.4,
      o: 0.25 + r(4) * 0.55,
      d: 3 + r(5) * 4,
      delay: -r(6) * 6,
    };
  });
  return (
    <>
      {motes.map((m, i) => (
        <circle
          key={i}
          cx={m.cx}
          cy={m.cy}
          r={m.r}
          fill="#fff"
          opacity={m.o}
          className="op-mote"
          style={{ animationDuration: `${m.d}s`, animationDelay: `${m.delay}s` }}
        />
      ))}
    </>
  );
}
