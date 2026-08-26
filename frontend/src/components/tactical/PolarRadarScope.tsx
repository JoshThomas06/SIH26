import { useEffect, useRef } from "react";
import { useTacticalStore } from "@/store/useTacticalStore";

export function PolarRadarScope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweep = useRef(0);
  const pdws = useTacticalStore((s) => s.latestPDWs);
  const connected = useTacticalStore((s) => s.isConnected);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 280;
    canvas.height = 250;
    let raf = 0;

    const draw = () => {
      sweep.current += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 6;
      const radius = 96;

      ctx.fillStyle = "#021207";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#021a0a";
      ctx.lineWidth = 1;
      for (const r of [0.3, 0.6, 1.0]) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, "rgba(0,255,102,0.12)");
      grad.addColorStop(1, "rgba(0,255,102,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, sweep.current, sweep.current + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#00ff66";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep.current) * radius, cy + Math.sin(sweep.current) * radius);
      ctx.stroke();

      for (const pdw of pdws) {
        const ang = (pdw.aoa_deg * Math.PI) / 180;
        const dist = Math.min(1, Math.max(0.08, (pdw.amplitude_db + 100) / 80));
        const x = cx + Math.cos(ang) * radius * dist;
        const y = cy + Math.sin(ang) * radius * dist;
        ctx.fillStyle = "#00ff66";
        ctx.shadowColor = "#00ff66";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [pdws]);

  return (
    <div className="border border-[#262626] bg-[#040404] p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span>360° CRT Radar Scope (Phosphor Green View)</span>
        <span className={connected ? "text-[#00ff66]" : "text-[#666]"}>
          {connected ? "System Live" : "Link Down"}
        </span>
      </div>
      <canvas ref={canvasRef} className="mx-auto block" />
    </div>
  );
}
