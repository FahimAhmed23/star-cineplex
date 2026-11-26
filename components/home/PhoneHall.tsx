"use client";

import { type MutableRefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

// §11 phones: instead of the live 3D hall, a still of the same hall (rendered from the 3D scene with the portrait
// camera, public/hero/hall-portrait.webp, 1080×2340) with the trailer laid exactly over its screen. Almost no GPU.

const IMG = { src: "/hero/hall-portrait.webp", w: 1080, h: 2340 };
/** the screen's corners in the still, as fractions (top-left, top-right, bottom-right, bottom-left) */
const QUAD: [number, number][] = [
  [-0.0147, 0.2509],
  [1.0138, 0.2509],
  [0.9652, 0.4436],
  [0.0339, 0.4436],
];
const BOX = { w: 1000, h: 428 }; // the flat screen the video is drawn into, before the perspective transform

/** CSS matrix3d that maps the rect (0,0)-(w,h) onto four points (standard homography). */
function quadMatrix(w: number, h: number, p: [number, number][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // unit square → quad, then scale the input rect to the unit square
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}

interface Props {
  src: string;
  poster?: string;
  crop?: { top: number; height: number };
  startAt?: number;
  loop?: boolean;
  muted?: boolean;
  playing?: boolean;
  /** 0..1 — the dip to black between trailers, the dim when a trailer ends */
  brightness?: number;
  onEnded?: () => void;
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
  onReady?: () => void;
}

export function PhoneHall({ src, poster, crop, startAt = 0, loop = true, muted = true, playing = true, brightness = 1, onEnded, videoRef, onReady }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [width, setWidth] = useState(0);
  const [live, setLive] = useState(false);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // new trailer: seek past the studio logos, then play (same rule as the 3D screen)
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (videoRef) videoRef.current = el;
    setLive(false);
    const onMeta = () => {
      if (startAt > 0 && isFinite(el.duration)) el.currentTime = el.duration * startAt;
      else if (playing) el.play().catch(() => {});
    };
    const onSeeked = () => playing && el.play().catch(() => {});
    el.addEventListener("seeked", onSeeked, { once: true });
    // the element may already have its metadata (cached file) before this effect runs
    if (el.readyState >= 1) onMeta();
    else el.addEventListener("loadedmetadata", onMeta, { once: true });
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("seeked", onSeeked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startAt only applies to a new src
  }, [src, videoRef, width > 0]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = muted;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [muted, playing, src, width > 0]);

  const height = (width * IMG.h) / IMG.w;
  const quad = QUAD.map(([x, y]) => [x * width, y * height] as [number, number]);
  const c = crop ?? { top: 0, height: 1 };
  // cover the flat screen with the real picture area of the trailer (it may carry baked-in black bars)
  const vh = Math.max((BOX.w * 9) / 16, BOX.h / c.height);
  const vw = (vh * 16) / 9;
  const media = { position: "absolute" as const, width: vw, height: vh, left: (BOX.w - vw) / 2, top: (BOX.h - vh * c.height) / 2 - vh * c.top };

  return (
    <div ref={wrap} className="absolute inset-x-0 top-0" style={{ aspectRatio: `${IMG.w} / ${IMG.h}` }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size still, preloaded */}
      <img src={IMG.src} alt="" className="absolute inset-0 size-full" onLoad={onReady} fetchPriority="high" />
      {width > 0 && (
        <div
          className="absolute top-0 left-0 overflow-hidden bg-black"
          style={{ width: BOX.w, height: BOX.h, transformOrigin: "0 0", transform: quadMatrix(BOX.w, BOX.h, quad) }}
        >
          <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: brightness }}>
            {poster && !live && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" style={{ ...media, objectFit: "cover" }} />
            )}
            <video
              ref={video}
              key={src}
              src={src}
              muted
              loop={loop}
              playsInline
              preload="auto"
              onPlaying={() => setLive(true)}
              onEnded={onEnded}
              style={{ ...media, opacity: live ? 1 : 0 }}
            />
          </div>
        </div>
      )}
      {/* soft light from the screen on the walls and the first rows */}
      <div
        className="pointer-events-none absolute inset-x-0 transition-opacity duration-500"
        style={{ top: "40%", height: "22%", opacity: 0.35 * brightness, background: "radial-gradient(60% 70% at 50% 0%, rgb(190 170 220 / 0.35), transparent 70%)" }}
      />
    </div>
  );
}
