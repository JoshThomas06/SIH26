import { useEffect, useRef } from "react";
import { useTacticalStore } from "@/store/useTacticalStore";

export function SpectrumWaterfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPaint = useRef(0);
  const bandStates = useTacticalStore((s) => s.bandStates);
  const tuned = useTacticalStore((s) => s.activeTunedBand);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bandStates.length === 0) return;
    const now = performance.now();
    if (now - lastPaint.current < 280) return;
    lastPaint.current = now;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const row = 5;
    const imageData = ctx.getImageData(0, 0, width, height - row);
    ctx.putImageData(imageData, 0, row);

    const bandWidth = width / bandStates.length;
    bandStates.forEach((band, index) => {
      const x = index * bandWidth;
      if (band.status === "OCCUPIED" || band.status === "LOCKED") {
        ctx.fillStyle = band.threat_level === "HIGH" ? "rgb(140,48,68)" : "rgb(168,168,168)";
      } else {
        ctx.fillStyle = "rgba(18,18,18,0.85)";
      }
      ctx.fillRect(x, 0, bandWidth - 1, row);
    });

    const markerX = tuned * bandWidth;
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(markerX, 0, Math.max(3, bandWidth - 1), row);
  }, [bandStates, tuned]);

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-[#262626] bg-[#040404] p-2 transition-colors hover:border-[#525252]">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00ff66]" />
        Tactical Spectrum Waterfall (0.5 — 18.0 GHz)
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="mt-6 h-[calc(100%-1.5rem)] w-full rounded-xl bg-[#0d0d0d]"
      />
    </div>
  );
}
