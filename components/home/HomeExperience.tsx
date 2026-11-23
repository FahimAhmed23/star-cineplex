"use client";

import { Navbar } from "@/components/nav/Navbar";
import { HallHero, type HeroMovie } from "./HallHero";
import { OpeningSequence } from "./OpeningSequence";
import type { ShowLite } from "./TonightStrip";
import type { Hall } from "@/lib/types";

interface Props {
  movies: HeroMovie[];
  hall: Hall;
  bookedSeats: string[];
  tonight: ShowLite[];
  titles: Record<string, { en: string; bn: string | null }>;
}

/** Home (CLAUDE.md §8): opening → navbar + 3D hall hero. Sections below the hero arrive in Phases 3–4. */
export function HomeExperience(props: Props) {
  return (
    <>
      <OpeningSequence />
      <Navbar revealWithIntro />
      <main>
        <HallHero {...props} />
      </main>
    </>
  );
}
