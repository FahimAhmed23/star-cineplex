"use client";

import { AdaptiveDpr, Html, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildLayout, type PlacedSeat } from "@/lib/hall-layout";
import { hallTheme } from "@/lib/data";
import type { Hall } from "@/lib/types";
import { Audience } from "./Audience";
import { CameraRig, type CameraMode } from "./CameraRig";
import { Room } from "./Room";
import { Screen } from "./Screen";
import { Seats } from "./Seats";

export interface Hall3DProps {
  hall: Hall;
  bookedSeats: string[];
  mode?: CameraMode;
  seatId?: string | null;
  resetKey?: number;
  trailer?: string;
  poster?: string;
  /** real picture area inside the trailer file (Movie.trailerCrop) */
  trailerCrop?: { top: number; height: number };
  muted?: boolean;
  /** where the trailer starts, as a fraction of its length (the hero skips studio logos) */
  startAt?: number;
  loop?: boolean;
  onTrailerEnded?: () => void;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** extra screen brightness multiplier read every frame (scroll dimming) */
  screenScale?: () => number;
  /** called once the scene (models, room) has rendered its first frame */
  onReady?: () => void;
  /** 0 = house lights down (hero), 1 = up enough to choose seats (overview) */
  houseLights?: number;
  screenBrightness?: number;
  playing?: boolean;
  /** pause rendering when the hall is off-screen (§8.3) */
  active?: boolean;
  selected?: Set<string>;
  hovered?: string | null;
  highlightClass?: string | null;
  onSeatPointer?: (seat: PlacedSeat | null, e?: ThreeEvent<PointerEvent>) => void;
  onSeatClick?: (seat: PlacedSeat, e: ThreeEvent<MouseEvent>) => void;
  onFps?: (fps: number) => void;
  /** §9.5 hover popup: HTML anchored above a seat */
  anchor?: { seatId: string; node: React.ReactNode } | null;
  /** §9.5 selected seats get a small gold ✓ marker above them */
  markers?: string[];
  /** §9.5 overview: glide the camera to show these seats (Best available); bump focusKey to re-run */
  focusSeats?: string[] | null;
  focusKey?: number;
  className?: string;
}

/**
 * The procedural cinema hall (CLAUDE.md §4, §6): everything is built from halls.json + the branch theme.
 * Client-only — load it with next/dynamic({ ssr: false }).
 */
export default function Hall3D(props: Hall3DProps) {
  const { active = true, className } = props;
  const [dpr, setDpr] = useState(1.5);
  const maxDpr = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent) ? 1.5 : 2;
  return (
    <Canvas
      className={className}
      frameloop={active ? "always" : "never"}
      dpr={[1, Math.min(dpr, maxDpr)]}
      camera={{ fov: 42, near: 0.05, far: 200, position: [0, 3, 12] }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false, preserveDrawingBuffer: true /* §9.6 seat-view still */ }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#07050a"]} />
      <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
      <AdaptiveDpr pixelated />
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}

function Scene({
  hall,
  bookedSeats,
  mode = "front",
  seatId,
  resetKey,
  trailer,
  poster,
  trailerCrop,
  startAt,
  loop = true,
  onTrailerEnded,
  videoRef,
  screenScale,
  onReady,
  muted = true,
  houseLights = 0,
  screenBrightness = 1,
  playing = true,
  selected,
  hovered,
  highlightClass,
  onSeatPointer,
  onSeatClick,
  onFps,
  anchor,
  markers,
  focusSeats,
  focusKey,
}: Hall3DProps) {
  const layout = useMemo(() => buildLayout(hall), [hall]);
  const theme = useMemo(() => hallTheme(hall), [hall]);
  const booked = useMemo(() => new Set(bookedSeats), [bookedSeats]);
  const colors = useMemo(() => ({ fabric: theme.seat, leather: theme.leather ?? theme.seat }), [theme]);
  const look = useMemo(
    () => ({ walls: theme.walls, carpet: theme.carpet, accentLight: theme.accentLight, accentPattern: theme.accentPattern }),
    [theme],
  );
  const rim = useMemo(() => new THREE.Color("#b784d6"), []);

  return (
    <>
      <HouseLights level={houseLights} layout={layout} />
      <Room layout={layout} look={look} />
      <Screen
        layout={layout}
        src={trailer}
        poster={poster}
        crop={trailerCrop}
        startAt={startAt}
        loop={loop}
        onEnded={onTrailerEnded}
        videoRef={videoRef}
        brightnessScale={screenScale}
        muted={muted}
        brightness={screenBrightness}
        playing={playing}
        beam={houseLights < 0.3 && mode !== "overview"}
        onLightColor={(c) => rim.copy(c)}
      />
      <Seats
        layout={layout}
        colors={colors}
        booked={booked}
        selected={selected}
        hovered={hovered}
        highlightClass={highlightClass}
        onSeatPointer={onSeatPointer}
        onSeatClick={onSeatClick}
      />
      <Audience layout={layout} booked={booked} rimColor={rim} />
      <CameraRig layout={layout} mode={mode} seatId={seatId} resetKey={resetKey} drift={mode === "front"} focusSeats={focusSeats} focusKey={focusKey} />
      {anchor && layout.byId.get(anchor.seatId) && (
        <Html
          key={anchor.seatId}
          position={[layout.byId.get(anchor.seatId)!.x, layout.byId.get(anchor.seatId)!.y + 1.15, layout.byId.get(anchor.seatId)!.z]}
          center
          zIndexRange={[40, 30]}
          style={{ pointerEvents: "auto" }}
        >
          {anchor.node}
        </Html>
      )}
      {mode !== "seat" &&
        markers?.map((id) => {
          const s = layout.byId.get(id);
          return s ? (
            <Html key={id} position={[s.x, s.y + 1.05, s.z]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
              <span className="seat-check" aria-hidden>✓</span>
            </Html>
          ) : null;
        })}
      <EffectComposer multisampling={0}>
        {/* bloom only on emissive parts: accent lights, step lights, the screen (§10) */}
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.05} intensity={0.8} radius={0.6} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
      {onFps && <FpsProbe onFps={onFps} />}
      {onReady && <ReadyProbe onReady={onReady} />}
    </>
  );
}

/** Dim ambient + a soft overhead fill; the overview raises it so every seat is readable. */
function HouseLights({ level, layout }: { level: number; layout: ReturnType<typeof buildLayout> }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const cur = useRef(level);
  useFrame((_, dt) => {
    cur.current += (level - cur.current) * (1 - Math.exp(-dt * 3));
    if (hemi.current) hemi.current.intensity = 0.12 + cur.current * 1.2;
    if (fill.current) fill.current.intensity = cur.current * 1.4; // off in the dark hero: heads stay silhouettes
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#9c8cc8", "#1a1020", 0.3]} />
      <directionalLight ref={fill} position={[0, layout.room.height + 6, layout.room.zBack + 6]} intensity={0.2} color="#fff1e0" />
    </>
  );
}

/** Fires once after the first rendered frame (everything inside the Suspense boundary has loaded). */
function ReadyProbe({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

function FpsProbe({ onFps }: { onFps: (fps: number) => void }) {
  const frames = useRef(0);
  const t0 = useRef(performance.now());
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - t0.current >= 1000) {
      onFps(Math.round((frames.current * 1000) / (now - t0.current)));
      frames.current = 0;
      t0.current = now;
    }
  });
  return null;
}
