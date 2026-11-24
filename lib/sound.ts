"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * §10 Sound: subtle, off by default, remembered. Every sound is synthesised with Web Audio (no files to load):
 * a projector hum for the opening, a door thunk + a little hall ambience for the cinema doors, a paper "print"
 * for the ticket. All very quiet, never on hover. Trailer audio is separate.
 */
export const useSound = create<{ on: boolean; toggle: () => void }>()(
  persist((set) => ({ on: false, toggle: () => set((s) => ({ on: !s.on })) }), { name: "sc-sound" }),
);

let ctx: AudioContext | null = null;
const audio = () => {
  if (typeof window === "undefined") return null;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

function noise(c: AudioContext, seconds: number, brown = false) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

const env = (c: AudioContext, peak: number, attack: number, hold: number, release: number, at = c.currentTime) => {
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.setValueAtTime(peak, at + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  g.connect(c.destination);
  return g;
};

const SOUNDS = {
  /** §8.1: a soft projector hum with a faint shutter flutter, ~3s */
  projector(c: AudioContext) {
    const g = env(c, 0.035, 0.6, 1.6, 1.2);
    const hum = c.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 50;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    const flutter = c.createGain();
    const lfo = c.createOscillator();
    lfo.frequency.value = 24; // 24 fps shutter
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain).connect(flutter.gain);
    hum.connect(lp).connect(flutter).connect(g);
    const air = noise(c, 3.4, true);
    const ag = c.createGain();
    ag.gain.value = 0.5;
    air.connect(ag).connect(g);
    [hum, lfo, air].forEach((n) => {
      n.start();
      n.stop(c.currentTime + 3.4);
    });
  },
  /** §9.4: a low door thunk, then a little hall ambience */
  doors(c: AudioContext) {
    const thunk = c.createOscillator();
    thunk.type = "sine";
    thunk.frequency.setValueAtTime(90, c.currentTime);
    thunk.frequency.exponentialRampToValueAtTime(42, c.currentTime + 0.25);
    thunk.connect(env(c, 0.12, 0.005, 0.02, 0.35));
    thunk.start();
    thunk.stop(c.currentTime + 0.45);
    const room = noise(c, 2.6, true);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    room.connect(lp).connect(env(c, 0.05, 0.5, 0.8, 1.2, c.currentTime + 0.1));
    room.start(c.currentTime + 0.1);
  },
  /** §9.8: a quick paper feed — a run of soft ticks over ~1s */
  print(c: AudioContext) {
    for (let i = 0; i < 14; i++) {
      const at = c.currentTime + i * 0.07 + Math.random() * 0.015;
      const tick = noise(c, 0.04);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400 + Math.random() * 800;
      bp.Q.value = 1.4;
      tick.connect(bp).connect(env(c, 0.03, 0.003, 0.005, 0.03, at));
      tick.start(at);
    }
  },
};

export type SoundName = keyof typeof SOUNDS;

/** Plays a cue only when sound is on (and the user has interacted, so the browser allows audio). */
export function playSound(name: SoundName) {
  if (!useSound.getState().on) return;
  const c = audio();
  if (!c || c.state !== "running") return;
  try {
    SOUNDS[name](c);
  } catch {
    /* audio is decoration — never break the page for it */
  }
}

/** Browsers only allow audio after a click or key press: unlock on the first one when sound is on. */
export function SoundUnlock() {
  if (typeof window !== "undefined" && !(window as unknown as { __scSoundUnlock?: boolean }).__scSoundUnlock) {
    (window as unknown as { __scSoundUnlock?: boolean }).__scSoundUnlock = true;
    const unlock = () => {
      if (useSound.getState().on) audio();
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
  }
  return null;
}

/** Turning sound on is itself a user gesture, so the audio context is unlocked here. */
export function toggleSound() {
  const wasOn = useSound.getState().on;
  useSound.getState().toggle();
  if (!wasOn) audio(); // unlock the audio context inside this click
}
