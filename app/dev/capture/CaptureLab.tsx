"use client";

import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { SeatTurntable } from "@/components/booking/SeatTurntable";
import { useSearchParams } from "next/navigation";
import { movies } from "@/lib/data";
import type { Hall } from "@/lib/types";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

export function CaptureLab({ hall, booked }: { hall: Hall; booked: string[] }) {
  const q = useSearchParams();
  const seat = q.get("seat") ?? "N12";
  const w = Number(q.get("w") ?? 540);
  const h = Number(q.get("h") ?? 600);
  const lights = Number(q.get("lights") ?? 0.15);
  const movie = movies.find((m) => m.slug === (q.get("movie") ?? "hunger-games-sunrise-on-the-reaping")) ?? movies[0];
  const seatModel = q.get("turntable") as "vip" | "premium" | "atmos" | null;
  if (seatModel)
    return (
      <div style={{ width: w, height: h, background: "#07050a" }} data-capture>
        <Canvas dpr={1} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => void (gl.toneMappingExposure = 1.05)}>
          <Suspense fallback={null}>
            <SeatTurntable model={seatModel} color={seatModel === "vip" ? "#6B1E24" : "#C0262D"} leather={seatModel === "vip"} hover={false} rings={seatModel === "atmos"} />
          </Suspense>
        </Canvas>
      </div>
    );
  return (
    <div style={{ width: w, height: h, position: "relative", background: "#07050a" }} data-capture>
      <Hall3D
        className="!absolute inset-0"
        hall={hall}
        bookedSeats={booked}
        mode={(q.get("mode") as "seat" | "front" | "overview") ?? "seat"}
        seatId={seat}
        trailer={movie.trailer}
        poster={movie.trailerPoster}
        trailerCrop={movie.trailerCrop}
        startAt={Number(q.get("t") ?? 0.3)}
        houseLights={lights}
        active
      />
    </div>
  );
}
