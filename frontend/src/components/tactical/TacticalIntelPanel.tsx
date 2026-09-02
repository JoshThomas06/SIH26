import { useState } from "react";
import { Activity, Radio, ShieldAlert } from "lucide-react";
import { chatterTrend, threatPosture } from "@/lib/rfIntel";
import { useTacticalStore } from "@/store/useTacticalStore";
import { cn } from "@/lib/utils";

const THREAT_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
const CHATTER_LEVELS = ["WARMING", "STABLE", "ACTIVE", "FADING"] as const;

type ThreatLevel = (typeof THREAT_LEVELS)[number];
type ChatterLevel = (typeof CHATTER_LEVELS)[number];

const THREAT_FILL: Record<ThreatLevel, number> = {
  LOW: 22,
  MODERATE: 48,
  HIGH: 74,
  CRITICAL: 100,
};

const THREAT_COLOR: Record<ThreatLevel, string> = {
  LOW: "#00ff66",
  MODERATE: "#f5b642",
  HIGH: "#ff8a3d",
  CRITICAL: "#ff2a6d",
};

const CHATTER_BARS: Record<ChatterLevel, number[]> = {
  WARMING: [18, 22, 20, 28, 24, 26, 22, 20],
  STABLE: [42, 46, 44, 48, 45, 47, 43, 46],
  ACTIVE: [88, 54, 96, 40, 90, 58, 84, 48],
  FADING: [62, 48, 36, 28, 22, 18, 14, 12],
};

export function TacticalIntelPanel() {
  const bands = useTacticalStore((s) => s.bandStates);
  const spawn = useTacticalStore((s) => s.env.hostile_spawn);
  const history = useTacticalStore((s) => s.rfHistory);
  const hot = bands.filter((band) => band.threat_level === "HIGH" && band.status !== "IDLE").length;
  const liveThreat = threatPosture(bands, spawn) as ThreatLevel;
  const rawChatter = chatterTrend(history);
  const liveChatter: ChatterLevel = rawChatter === "COLLECTING" ? "WARMING" : (rawChatter as ChatterLevel);

  const [threatPin, setThreatPin] = useState<"LIVE" | ThreatLevel>("LIVE");
  const [chatterPin, setChatterPin] = useState<"LIVE" | ChatterLevel>("LIVE");
  const threat = threatPin === "LIVE" ? liveThreat : threatPin;
  const chatter = chatterPin === "LIVE" ? liveChatter : chatterPin;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto bg-card p-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        <span>Tactical posture</span>
        <button
          type="button"
          className="sj-fill rounded border border-zinc-600 px-2 py-0.5 text-zinc-200"
          onClick={() => {
            setThreatPin("LIVE");
            setChatterPin("LIVE");
          }}
        >
          Follow live
        </button>
      </div>

      <section className="rounded-xl border border-border/80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4" style={{ color: THREAT_COLOR[threat] }} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Threat</span>
          </div>
          <span className="font-mono text-xs" style={{ color: THREAT_COLOR[threat] }}>
            {threat}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-[#121212]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${THREAT_FILL[threat]}%`, background: THREAT_COLOR[threat] }}
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {THREAT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={cn(
                "rounded-md border px-1 py-1 font-mono text-[9px] uppercase tracking-widest",
                threat === level ? "border-transparent text-[#040404]" : "border-zinc-700 text-zinc-400",
              )}
              style={threat === level ? { background: THREAT_COLOR[level] } : undefined}
              onClick={() => setThreatPin(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
          {hot} hot HIGH bands · spawn {spawn.toFixed(2)}
          {threatPin !== "LIVE" ? " · pinned" : ""}
        </p>
      </section>

      <section className="rounded-xl border border-border/80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-zinc-300" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Chatter</span>
          </div>
          <span className="font-mono text-xs text-zinc-200">{chatter}</span>
        </div>
        <div className="flex h-16 items-end gap-1">
          {CHATTER_BARS[chatter].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-sm"
              style={{
                height: `${height}%`,
                background: chatter === "ACTIVE" ? "#ff2a6d" : chatter === "FADING" ? "#7dffa9" : "#f5b642",
                opacity: 0.45 + (index % 2) * 0.25,
              }}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {CHATTER_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={cn(
                "rounded-md border px-1 py-1 font-mono text-[9px] uppercase tracking-widest",
                chatter === level ? "border-[#e4e4e7] bg-[#e4e4e7] text-[#040404]" : "border-zinc-700 text-zinc-400",
              )}
              onClick={() => setChatterPin(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
          <Radio className="size-3" />
          {history.length} RF snapshots
          {chatterPin !== "LIVE" ? " · pinned" : ""}
        </p>
      </section>
    </div>
  );
}
