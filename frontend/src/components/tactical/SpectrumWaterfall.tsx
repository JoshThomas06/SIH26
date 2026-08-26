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
    const row = 6;
    const imageData = ctx.getImageData(0, 0, width, height - row);
    ctx.putImageData(imageData, 0, row);

    const bandWidth = width / bandStates.length;
    bandStates.forEach((band, index) => {
      const x = index * bandWidth;
      const inset = 1.5;
      if (band.status === "OCCUPIED" || band.status === "LOCKED") {
        ctx.fillStyle = band.threat_level === "HIGH" ? "rgb(140,48,68)" : "rgb(168,168,168)";
      } else {
        ctx.fillStyle = "rgba(18,18,18,0.85)";
      }
      ctx.fillRect(x + inset, 1, Math.max(1, bandWidth - inset * 2), row - 2);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x + inset, 1, Math.max(1, bandWidth - inset * 2), row - 2);
    });

    const markerX = tuned * bandWidth;
    ctx.shadowColor = "#00ff66";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(markerX + 1.5, 0, Math.max(2, bandWidth - 3), row);
    ctx.shadowBlur = 0;
  }, [bandStates, tuned]);

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-border bg-card p-2 transition-colors hover:border-[#525252]">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00ff66]" />
        Tactical Spectrum Waterfall (0.5 — 18.0 GHz)
      </div>
      <div className="relative mt-6 h-[calc(100%-1.5rem)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="h-full w-full rounded-xl border border-white/10 bg-[#0d0d0d]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[repeating-linear-gradient(to_bottom,transparent_0_5px,rgba(0,255,102,0.035)_5px_6px)] mix-blend-screen" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#00ff66]/40" />
      </div>
    </div>
  );
}
