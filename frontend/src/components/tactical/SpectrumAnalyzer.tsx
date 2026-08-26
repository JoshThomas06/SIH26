import { setSchedulerConfig } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useTacticalStore } from "@/store/useTacticalStore";

export function SpectrumAnalyzer() {
  const bands = useTacticalStore((s) => s.bandStates);
  const tuned = useTacticalStore((s) => s.activeTunedBand);
  const running = useTacticalStore((s) => s.running);
  const env = useTacticalStore((s) => s.env);
  const setSchedulerMode = useTacticalStore((s) => s.setSchedulerMode);

  const lockBand = async (index: number) => {
    setSchedulerMode("MANUAL");
    await setSchedulerConfig({ mode: "MANUAL", manual_band: index });
  };

  const toggleIgnore = async (index: number, ignored: boolean) => {
    await setSchedulerConfig(ignored ? { unignore_band: index } : { ignore_band: index });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Spectrum analyzer // spawn {env.hostile_spawn.toFixed(2)} · noise {env.noise_floor.toFixed(2)}</span>
        <span className={running ? "text-[#00ff66]" : "text-muted-foreground"}>
          {running ? "Hopping" : "Idle"}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-8 gap-1">
        {bands.map((band, index) => {
          const active = index === tuned;
          const live = band.status === "OCCUPIED" || band.status === "LOCKED";
          const high = band.threat_level === "HIGH";
          const noiseH = 10 + env.noise_floor * 55;
          const liveH = Math.max(28, Math.min(100, band.priority_score * 100 * (0.65 + env.hostile_spawn * 0.55)));
          const height = live ? (high ? Math.max(liveH, 40 + env.hostile_spawn * 60) : liveH) : noiseH;
          return (
            <button
              key={band.band_id}
              type="button"
              onClick={() => void lockBand(index)}
              onContextMenu={(event) => {
                event.preventDefault();
                void toggleIgnore(index, Boolean(band.ignored));
              }}
              className={cn(
                "group relative flex min-h-[7rem] flex-col justify-end overflow-hidden rounded-sm border border-black px-0.5 pb-1 pt-4",
                band.ignored ? "bg-muted/40 opacity-50" : "bg-[#0d0d0d]",
                active && "outline outline-1 outline-[#3f3f46]",
                high && live && "border-[#7f1d1d]",
              )}
              title={`Band ${String(band.band_id).padStart(2, "0")} · ${band.center_freq_mhz} MHz`}
            >
              {active && <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#a1a1aa]" />}
              <span
                className={cn(
                  "w-full rounded-[1px]",
                  high && live ? "bg-[#9f2a4a]" : live ? "bg-[#8a8a8a]" : "bg-[#3f3f46]",
                )}
                style={{ height: `${height}%`, opacity: live ? 0.85 + env.hostile_spawn * 0.15 : 0.35 + env.noise_floor * 0.5 }}
              />
              <span className="mt-1 font-mono text-[8px] text-muted-foreground">
                {String(band.band_id).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
