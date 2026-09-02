import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { exportRfHistoryCsv } from "@/lib/rfIntel";
import { useTacticalStore } from "@/store/useTacticalStore";

export function SpectrumWaterfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastPaint = useRef(0);
  const bandStates = useTacticalStore((s) => s.bandStates);
  const tuned = useTacticalStore((s) => s.activeTunedBand);
  const rfHistory = useTacticalStore((s) => s.rfHistory);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || bandStates.length === 0) return;
    const now = performance.now();
    if (now - lastPaint.current < 280) return;
    lastPaint.current = now;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = Math.max(320, wrap.clientWidth);
    const h = Math.max(160, wrap.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const row = 5;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height - row);
    ctx.putImageData(imageData, 0, row);

    const bandWidth = canvas.width / bandStates.length;
    bandStates.forEach((band, index) => {
      const x = index * bandWidth;
      if (band.status === "OCCUPIED" || band.status === "LOCKED") {
        ctx.fillStyle = band.threat_level === "HIGH" ? "rgb(92,38,48)" : "rgb(212,160,40)";
      } else {
        ctx.fillStyle = "rgb(12,12,12)";
      }
      ctx.fillRect(Math.floor(x) + 1, 0, Math.max(1, Math.floor(bandWidth) - 2), row);
    });

    const markerX = tuned * bandWidth;
    ctx.fillStyle = "rgb(70,90,72)";
    ctx.fillRect(Math.floor(markerX) + 1, 0, Math.max(1, Math.floor(bandWidth) - 2), row);
  }, [bandStates, tuned]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#040404]">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-300">
          Tactical spectrum waterfall (0.5 — 18.0 GHz)
        </div>
        <button
          type="button"
          className="sj-fill relative z-10 rounded border border-zinc-600 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-200 disabled:opacity-40"
          disabled={rfHistory.length === 0}
          onClick={() => exportRfHistoryCsv(rfHistory)}
        >
          <span className="inline-flex items-center gap-1">
            <Download className="size-3" />
            CSV
          </span>
        </button>
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1 p-2">
        <canvas ref={canvasRef} className="h-full w-full bg-black" />
      </div>
    </div>
  );
}
