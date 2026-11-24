"use client";

import { useEffect } from "react";
import { useDoors } from "@/lib/doors";
import { playSound } from "@/lib/sound";

/**
 * §9.4 the cinema doors (≈1.8s): padded purple leather doors slide in and meet, a "HALL 1" sign flickers on
 * above them while the next screen loads, then they swing inward (hinged at the outer edges) with warm
 * light spilling through the gap. Reduced motion: the closed doors just fade out.
 */
export function CinemaDoors() {
  const phase = useDoors((s) => s.phase);
  const sign = useDoors((s) => s.sign);
  useEffect(() => {
    if (phase === "opening") playSound("doors");
  }, [phase]);
  if (phase === "idle") return null;
  return (
    <div className={`doors doors--${phase}`} role="status" aria-live="polite">
      <div className="doors__light" aria-hidden />
      <div className="doors__door doors__door--left" aria-hidden>
        <span className="doors__porthole" />
        <span className="doors__plate" />
      </div>
      <div className="doors__door doors__door--right" aria-hidden>
        <span className="doors__porthole" />
        <span className="doors__plate" />
      </div>
      {sign && (
        <div className="doors__sign">
          <p className="doors__hall">{sign.hall}</p>
          <p className="doors__line">{sign.line}</p>
        </div>
      )}
    </div>
  );
}
