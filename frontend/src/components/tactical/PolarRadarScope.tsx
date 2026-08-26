import { useEffect, useRef } from "react";
import { useTacticalStore, type BandState, type PDWIntercept } from "@/store/useTacticalStore";
import { cn } from "@/lib/utils";
import { useUiPrefs } from "@/store/useUiPrefs";

const HIGH_MHZ = new Set([2000, 4000, 6500]);
const PULSE_MS = 5600;
const FADE_MS = 5500;
const BEAM_RAD = 0.14;

type PaintedBlip = {
  id: number;
  x: number;
  y: number;
  anomaly: boolean;
  paintedAt: number;
};

function isAnomaly(pdw: PDWIntercept, bands: BandState[]) {
  const match = bands.find((band) => Math.abs(band.center_freq_mhz - pdw.center_freq_mhz) < 1);
  if (match?.threat_level === "HIGH") return true;
  return HIGH_MHZ.has(Math.round(pdw.center_freq_mhz));
}

function aoaToCanvas(deg: number) {
  return ((deg - 90) * Math.PI) / 180;
}

function angAbsDiff(a: number, b: number) {
  const tau = Math.PI * 2;
  let d = (a - b) % tau;
  if (d < 0) d += tau;
  if (d > Math.PI) d = tau - d;
  return d;
}

export function PolarRadarScope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sweep = useRef(-Math.PI / 2);
  const painted = useRef<Map<number, PaintedBlip>>(new Map());
  const pdws = useTacticalStore((s) => s.latestPDWs);
  const bands = useTacticalStore((s) => s.bandStates);
  const env = useTacticalStore((s) => s.env);
  const pdwsRef = useRef(pdws);
  const bandsRef = useRef(bands);
  const envRef = useRef(env);
  const connected = useTacticalStore((s) => s.isConnected);
  const persistCrtDark = useUiPrefs((s) => s.persistCrtDark);
  pdwsRef.current = pdws;
  bandsRef.current = bands;
  envRef.current = env;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const fit = () => {
      const w = Math.max(280, wrap.clientWidth);
      const h = Math.max(220, wrap.clientHeight);
      canvas.width = w;
      canvas.height = h;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const draw = () => {
      const liveEnv = envRef.current;
      const step = ((0.0022 + 0.22 / Math.max(20, liveEnv.sweep_ms)) * Math.max(0.25, liveEnv.sim_speed));
      sweep.current += step;
      const pulse = (performance.now() / PULSE_MS) % 1;
      const livePdws = pdwsRef.current;
      const liveBands = bandsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 4;
      const radius = Math.max(70, Math.min(w, h) / 2 - 36);

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

      ctx.fillStyle = "rgba(0, 255, 102, 0.55)";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - radius - 10);
      ctx.fillText("S", cx, cy + radius + 18);
      ctx.textAlign = "left";
      ctx.fillText("E", cx + radius + 8, cy + 3);
      ctx.textAlign = "right";
      ctx.fillText("W", cx - radius - 8, cy + 3);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(0, 255, 102, 0.16)";
      ctx.lineWidth = 1;
      for (const r of [0.25, 0.5, 0.75, 1.0]) {
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

      const noiseN = Math.round(liveEnv.noise_floor * 48);
      for (let i = 0; i < noiseN; i++) {
        const ang = (i * 2.47 + pulse * 6) % (Math.PI * 2);
        const dist = 0.18 + ((i * 17) % 80) / 100;
        ctx.globalAlpha = 0.08 + liveEnv.noise_floor * 0.18;
        ctx.fillStyle = "#6b7280";
        ctx.fillRect(cx + Math.cos(ang) * radius * dist, cy + Math.sin(ang) * radius * dist, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;

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
      const seen = new Set<number>();
      const spawnBoost = liveEnv.hostile_spawn;
      for (const pdw of livePdws) {
        const id = pdw.trackId ?? pdw.pdw_id;
        seen.add(id);
        const ang = aoaToCanvas(pdw.aoa_deg);
        const dist = Math.min(1, Math.max(0.12, (pdw.amplitude_db + 100) / 80));
        const x = cx + Math.cos(ang) * radius * dist;
        const y = cy + Math.sin(ang) * radius * dist;
        if (angAbsDiff(sweep.current, ang) <= BEAM_RAD) {
          painted.current.set(id, {
            id,
            x,
            y,
            anomaly: isAnomaly(pdw, liveBands),
            paintedAt: now,
          });
        }
      }

      for (const [id, blip] of [...painted.current.entries()]) {
        const age = now - blip.paintedAt;
        if (age > FADE_MS || (!seen.has(id) && age > FADE_MS * 0.55)) {
          painted.current.delete(id);
          continue;
        }
        const alpha = Math.max(0, 1 - age / FADE_MS);
        const color = blip.anomaly ? "#ff2a6d" : "#00ff66";
        ctx.globalAlpha = alpha * (blip.anomaly ? 0.55 + spawnBoost * 0.45 : 0.7);
        if (blip.anomaly) {
          ctx.beginPath();
          ctx.arc(blip.x, blip.y, 8 + spawnBoost * 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 42, 109, 0.45)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = blip.anomaly ? 8 + spawnBoost * 8 : 5;
        ctx.beginPath();
        ctx.arc(blip.x, blip.y, blip.anomaly ? 2.6 + spawnBoost * 1.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-[#040404]", persistCrtDark && "crt-persist")}>
      <div className="shrink-0 px-3 pt-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <div className="flex items-center justify-between">
          <span>360° CRT · beam tied to sweep / speed</span>
          <span className={connected ? "text-[#00ff66]" : "text-[#666]"}>
            {connected ? "System Live" : "Link Down"}
          </span>
        </div>
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full bg-transparent" />
      </div>
      <p className="relative z-10 mt-1 shrink-0 pb-2 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        Blips paint only when the beam crosses bearing · fade ~5.5 s · green intercept · red HIGH
      </p>
    </div>
  );
}
