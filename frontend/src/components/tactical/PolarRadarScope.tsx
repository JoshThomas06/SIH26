import { useEffect, useRef } from "react";
import { useTacticalStore, type BandState, type PDWIntercept } from "@/store/useTacticalStore";

const HIGH_MHZ = new Set([2000, 4000, 6500]);
const SWEEP_STEP = 0.0045;
const PULSE_MS = 5600;

function isAnomaly(pdw: PDWIntercept, bands: BandState[]) {
  const match = bands.find((band) => Math.abs(band.center_freq_mhz - pdw.center_freq_mhz) < 1);
  if (match?.threat_level === "HIGH") return true;
  return HIGH_MHZ.has(Math.round(pdw.center_freq_mhz));
}

export function PolarRadarScope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweep = useRef(0);
  const pdws = useTacticalStore((s) => s.latestPDWs);
  const bands = useTacticalStore((s) => s.bandStates);
  const pdwsRef = useRef(pdws);
  const bandsRef = useRef(bands);
  const connected = useTacticalStore((s) => s.isConnected);
  pdwsRef.current = pdws;
  bandsRef.current = bands;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 420;
    canvas.height = 380;
    let raf = 0;

    const draw = () => {
      sweep.current += SWEEP_STEP;
      const pulse = (performance.now() / PULSE_MS) % 1;
      const livePdws = pdwsRef.current;
      const liveBands = bandsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = 148;

      ctx.clearRect(0, 0, w, h);

      const wash = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 1.35);
      wash.addColorStop(0, "rgba(2, 26, 10, 0.92)");
      wash.addColorStop(0.55, "rgba(2, 18, 8, 0.55)");
      wash.addColorStop(0.82, "rgba(4, 4, 4, 0.2)");
      wash.addColorStop(1, "rgba(4, 4, 4, 0)");
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(0, 255, 102, 0.16)";
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

      for (let i = 0; i < 2; i++) {
        const t = (pulse + i * 0.5) % 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + t * (radius - 12), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 102, ${0.35 * (1 - t)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 6 + Math.sin(pulse * Math.PI * 2) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 102, 0.9)";
      ctx.shadowColor = "#00ff66";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      const beam = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      beam.addColorStop(0, "rgba(0,255,102,0.18)");
      beam.addColorStop(1, "rgba(0,255,102,0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, sweep.current - 0.42, sweep.current);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#00ff66";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep.current) * radius, cy + Math.sin(sweep.current) * radius);
      ctx.stroke();

      const now = Date.now();
      for (const pdw of livePdws) {
        const age = Math.min(1, (now - (pdw.born || now)) / 3200);
        const ang = (pdw.aoa_deg * Math.PI) / 180;
        const dist = Math.min(1, Math.max(0.12, (pdw.amplitude_db + 100) / 80));
        const x = cx + Math.cos(ang) * radius * dist;
        const y = cy + Math.sin(ang) * radius * dist;
        const anomaly = isAnomaly(pdw, liveBands);
        const color = anomaly ? "#ff2a6d" : "#00ff66";
        ctx.globalAlpha = 1 - age * 0.55;
        if (anomaly) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 42, 109, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = anomaly ? 10 : 6;
        ctx.beginPath();
        ctx.arc(x, y, anomaly ? 3.2 : 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative overflow-visible px-3 pb-2 pt-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_54%,transparent_0%,transparent_42%,rgba(4,4,4,0.55)_68%,#040404_88%)]" />
      <div className="relative z-10 mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span>360° CRT Radar Scope (Phosphor Green View)</span>
        <span className={connected ? "text-[#00ff66]" : "text-[#666]"}>
          {connected ? "System Live" : "Link Down"}
        </span>
      </div>
      <canvas ref={canvasRef} className="relative z-0 mx-auto block bg-transparent" />
      <p className="relative z-10 mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-[#555]">
        Green = intercept · Red = high-threat anomaly · tracks hold ~3 s
      </p>
    </div>
  );
}
