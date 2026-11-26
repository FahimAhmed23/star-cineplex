"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { HallLayout } from "@/lib/hall-layout";

RectAreaLightUniformsLib.init();

interface Props {
  layout: HallLayout;
  /** trailer .mp4; poster is shown until it plays, and instead of it if it fails (§9.9) */
  src?: string;
  poster?: string;
  /** real picture area inside the trailer file (Movie.trailerCrop) */
  crop?: { top: number; height: number };
  /** start position as a fraction of the trailer (e.g. 0.18 skips studio logos) */
  startAt?: number;
  /** loop the trailer (carousel) or play it once (trailer view, §8.7) */
  loop?: boolean;
  onEnded?: () => void;
  /** extra brightness multiplier read every frame (scroll-driven dimming, §8.3) — no re-renders */
  brightnessScale?: () => number;
  muted?: boolean;
  /** 0..1 — the hero brightens 10% → 100% (§8.1), the scroll transition dims to 35% (§8.3) */
  brightness?: number;
  playing?: boolean;
  /** receives the screen's average colour (for the silhouettes' rim light) */
  onLightColor?: (c: THREE.Color) => void;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** projector beam: an atmosphere touch for the dark hero; hidden when the house lights are up */
  beam?: boolean;
}

const FALLBACK = new THREE.Color("#c9b8ff");

/** The hall screen: trailer as a video texture, its light spilling onto the first rows and walls. */
export function Screen({ layout, src, poster, crop, startAt = 0, loop = true, onEnded, brightnessScale, muted = true, brightness = 1, playing = true, onLightColor, videoRef, beam = true }: Props) {
  const { screen, room } = layout;
  const [videoTex, setVideoTex] = useState<THREE.VideoTexture | null>(null);
  const [posterTex, setPosterTex] = useState<THREE.Texture | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.RectAreaLight>(null);
  const avg = useRef(FALLBACK.clone());
  const target = useRef(FALLBACK.clone());
  const level = useRef(brightness);
  const gl = useThree((s) => s.gl);

  // poster texture
  useEffect(() => {
    if (!poster) return setPosterTex(null);
    const tex = new THREE.TextureLoader().load(poster);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    setPosterTex(tex);
    return () => tex.dispose();
  }, [poster]);

  // video element + texture
  useEffect(() => {
    if (!src) return;
    const el = document.createElement("video");
    Object.assign(el, { src, crossOrigin: "anonymous", loop, muted: true, playsInline: true, preload: "auto" });
    el.setAttribute("playsinline", "");
    video.current = el;
    if (videoRef) videoRef.current = el;
    const tex = new THREE.VideoTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    // the 1280px video is shown smaller than its size: mipmaps keep edges clean instead of shimmering (Nov 26)
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const onPlaying = () => setVideoTex(tex);
    const onError = () => setVideoTex(null);
    // seek past the studio logos first, then play (so the first frame shown is already the film)
    const onMeta = () => {
      if (startAt > 0 && isFinite(el.duration)) el.currentTime = el.duration * startAt;
      else el.play().catch(() => {});
    };
    const onSeeked = () => el.play().catch(() => {});
    el.addEventListener("playing", onPlaying);
    el.addEventListener("error", onError);
    el.addEventListener("loadedmetadata", onMeta, { once: true });
    el.addEventListener("seeked", onSeeked, { once: true });
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("error", onError);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("seeked", onSeeked);
      el.pause();
      el.removeAttribute("src");
      el.load();
      tex.dispose();
      setVideoTex(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startAt only applies to a new src
  }, [src, gl, videoRef]);

  // "ended" callback (trailer view shows Replay / Buy Tickets on the screen)
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.loop = loop;
    const onEnd = () => endedRef.current?.();
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, [loop, videoTex]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.muted = muted;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [muted, playing, videoTex]);

  const map = videoTex ?? posterTex;

  // The picture fills the whole screen, edge to edge. Trailers carry baked-in black bars (scope films in a 16:9
  // file), so only the real picture area (`crop`, measured by scripts/detect-trailer-crops.mjs) is mapped, then
  // cover-fitted to the screen's shape — a sliver may be trimmed at the sides, never padded with bands.
  const img = map?.image as { videoWidth?: number; videoHeight?: number; width?: number; height?: number } | undefined;
  const fileAspect = (img?.videoWidth || img?.width || 16) / (img?.videoHeight || img?.height || 9);
  const isVideo = map === videoTex && !!videoTex;
  const picture = { w: screen.width, h: screen.height };
  useEffect(() => {
    if (!map) return;
    const c = isVideo && crop ? crop : { top: 0, height: 1 };
    const v0 = 1 - (c.top + c.height); // texture v runs bottom → top
    const contentAspect = fileAspect / c.height;
    const screenAspect = screen.width / screen.height;
    if (contentAspect > screenAspect) {
      const rx = screenAspect / contentAspect;
      map.repeat.set(rx, c.height);
      map.offset.set((1 - rx) / 2, v0);
    } else {
      const ry = c.height * (contentAspect / screenAspect);
      map.repeat.set(1, ry);
      map.offset.set(0, v0 + (c.height - ry) / 2);
    }
  }, [map, isVideo, crop, fileAspect, screen.width, screen.height]);

  // sample the average colour of the picture a few times a second (tiny canvas, cheap)
  const sampler = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    return c.getContext("2d", { willReadFrequently: true });
  }, []);
  const lastSample = useRef(0);

  useFrame((state, dt) => {
    const want = brightness * (brightnessScale ? brightnessScale() : 1);
    level.current += (want - level.current) * (1 - Math.exp(-dt * 10)); // fast enough for a 300ms dip to black
    const el = video.current;
    if (sampler && el && videoTex && el.readyState >= 2 && state.clock.elapsedTime - lastSample.current > 0.25) {
      lastSample.current = state.clock.elapsedTime;
      try {
        sampler.drawImage(el, 0, 0, 4, 4);
        const d = sampler.getImageData(0, 0, 4, 4).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        target.current.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
        // keep some light even on dark frames; soften towards white/purple
        target.current.lerp(FALLBACK, 0.35);
      } catch {
        target.current.copy(FALLBACK);
      }
    }
    avg.current.lerp(target.current, 1 - Math.exp(-dt * 3));
    // stays just under the bloom threshold: bloom is for the light strips, not a haze around the picture
    if (matRef.current) matRef.current.color.setScalar(Math.max(0.04, level.current) * (map ? 1 : 0.8)); // the picture at full strength
    if (light.current) {
      light.current.color.copy(avg.current);
      light.current.intensity = 1.6 * level.current;
    }
    onLightColor?.(avg.current);
  });

  // flat, or a gentle slice of a cylinder for the Atmos hall's wide curved screen
  const radius = screen.curved ? screen.width * 1.6 : 0;
  const surfaceGeo = useMemo(() => panel(screen.width, screen.height, radius), [screen.width, screen.height, radius]);
  const pictureGeo = useMemo(() => panel(picture.w, picture.h, radius), [picture.w, picture.h, radius]);
  const sag = radius ? radius - Math.sqrt(radius * radius - (screen.width / 2) ** 2) : 0; // how far the edges come forward

  const MASK = 0.55; // black velvet masking around the screen
  const TRIM = 0.06; // thin metal trim between masking and screen surface
  const W = screen.width;
  const H = screen.height;

  return (
    <group position={[0, screen.y, screen.z]}>
      {/* screen surface: matte, near-black where the projector shows nothing (around the picture) */}
      <mesh geometry={surfaceGeo}>
        <meshStandardMaterial color="#2a2830" emissive="#1a1920" roughness={0.95} />
      </mesh>
      {/* the picture, inside the screen */}
      <mesh geometry={pictureGeo} position={[0, 0, 0.004]}>
        <meshBasicMaterial ref={matRef} map={map ?? undefined} color="#e9e4f5" toneMapped={false} />
      </mesh>
      {/* metal trim around the screen surface — it catches the screen light so the edge reads */}
      <group position={[0, 0, sag + 0.02]}>
        {[
          [0, H / 2 + TRIM / 2, W + TRIM * 2, TRIM],
          [0, -H / 2 - TRIM / 2, W + TRIM * 2, TRIM],
          [-W / 2 - TRIM / 2, 0, TRIM, H],
          [W / 2 + TRIM / 2, 0, TRIM, H],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.04]} />
            <meshStandardMaterial color="#8d8a96" emissive="#2c2a33" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {/* black velvet masking border, framing the screen on all four sides */}
      <group position={[0, 0, sag + 0.01]}>
        {[
          [0, H / 2 + TRIM + MASK / 2, W + (TRIM + MASK) * 2, MASK],
          [0, -H / 2 - TRIM - MASK / 2, W + (TRIM + MASK) * 2, MASK],
          [-W / 2 - TRIM - MASK / 2, 0, MASK, H + TRIM * 2],
          [W / 2 + TRIM + MASK / 2, 0, MASK, H + TRIM * 2],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.06]} />
            <meshStandardMaterial color="#060507" roughness={1} />
          </mesh>
        ))}
      </group>
      {/* light spill from the picture onto the first rows and the walls */}
      <rectAreaLight
        ref={light}
        width={picture.w}
        height={picture.h}
        position={[0, 0, 0.3]}
        rotation={[0, Math.PI, 0]} /* lights emit along −Z; turn it to face the audience (+Z) */
        intensity={2.6}
        color={FALLBACK}
      />
      {/* faint projector beam from the booth to the picture (in world space) */}
      <group position={[0, -screen.y, -screen.z]}>
        <ProjectorBeam visible={beam} from={[0, Math.min(room.height - 0.8, layout.tiers[layout.tiers.length - 1].y + 3), room.zBack - 0.05]} to={[0, screen.y, screen.z]} size={[picture.w, picture.h]} level={level} />
      </group>
    </group>
  );
}

/** A screen-shaped panel facing +Z: flat, or curved around a vertical axis (radius > 0). */
function panel(w: number, h: number, radius: number) {
  if (!radius) return new THREE.PlaneGeometry(w, h);
  const theta = w / radius;
  const g = new THREE.CylinderGeometry(radius, radius, h, 48, 1, true, Math.PI - theta / 2, theta);
  g.scale(-1, 1, 1); // face inwards (towards the audience)
  g.translate(0, 0, radius);
  return g;
}

function ProjectorBeam({ from, to, size, level, visible }: { from: [number, number, number]; to: [number, number, number]; size: [number, number]; level: React.MutableRefObject<number>; visible: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(visible ? 1 : 0);
  const { geometry, position, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const len = a.distanceTo(b);
    // a 4-sided pyramid from the booth (apex) to the screen rectangle
    const g = new THREE.ConeGeometry(1, len, 4, 1, true);
    g.rotateY(Math.PI / 4);
    g.scale(size[0] * 0.71, 1, size[1] * 0.71);
    g.rotateX(Math.PI / 2); // apex towards −Z… then aim it
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), b.clone().sub(a).normalize());
    // cone apex is at +len/2 on its axis; after rotateX it points to −Z
    return { geometry: g, position: a.clone().lerp(b, 0.5), quaternion: q };
  }, [from, to, size]);
  // bright at the projector, fading out well before the screen (cone uv.y = 0 at the apex, 1 at the screen)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#cfd8ff") } },
        vertexShader: `varying float vT; void main(){ vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vT;
          void main(){ float a = uOpacity * pow(1.0 - vT, 4.0); gl_FragColor = vec4(uColor * a, 1.0); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useFrame((_, dt) => {
    fade.current += ((visible ? 1 : 0) - fade.current) * (1 - Math.exp(-dt * 3));
    material.uniforms.uOpacity.value = 0.09 * level.current * fade.current;
    material.visible = fade.current > 0.01;
  });
  void mat;
  return <mesh geometry={geometry} material={material} position={position} quaternion={quaternion} raycast={() => null} />;
}
