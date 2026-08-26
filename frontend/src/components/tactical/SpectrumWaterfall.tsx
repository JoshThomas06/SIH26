import { useEffect, useRef } from "react";
import { useTacticalStore } from "@/store/useTacticalStore";

export function SpectrumWaterfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandStates = useTacticalStore((s) => s.bandStates);
  const tuned = useTacticalStore((s) => s.activeTunedBand);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bandStates.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height - 2);
    ctx.putImageData(imageData, 0, 2);

    const bandWidth = width / bandStates.length;
    bandStates.forEach((band, index) => {
      const x = index * bandWidth;
      if (band.status === "OCCUPIED" || band.status === "LOCKED") {
        const g = band.threat_level === "HIGH" ? 90 : 180;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
      } else {
        const opacity = Math.max(0.05, 1 - band.aoi_ms / 2000);
        ctx.fillStyle = `rgba(18,18,18,${opacity})`;
      }
      ctx.fillRect(x, 0, bandWidth, 2);
    });

    const markerX = tuned * bandWidth;
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(markerX, 0, Math.max(2, bandWidth), 2);
  }, [bandStates, tuned]);

  return (
    <div className="relative h-80 border border-[#262626] bg-[#040404] p-2">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00ff66]" />
        Tactical Spectrum Waterfall (0.5 — 8.0 GHz)
      </div>
      <canvas ref={canvasRef} width={800} height={300} className="mt-6 h-[calc(100%-1.5rem)] w-full bg-[#0d0d0d]" />
    </div>
  );
}
