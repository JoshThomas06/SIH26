import { setSchedulerConfig } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useTacticalStore } from "@/store/useTacticalStore";

export function SpectrumAnalyzer() {
  const bands = useTacticalStore((s) => s.bandStates);
  const tuned = useTacticalStore((s) => s.activeTunedBand);
  const running = useTacticalStore((s) => s.running);
  const setSchedulerMode = useTacticalStore((s) => s.setSchedulerMode);

  const lockBand = async (index: number) => {
    setSchedulerMode("MANUAL");
    await setSchedulerConfig({ mode: "MANUAL", manual_band: index });
  };

  const toggleIgnore = async (index: number, ignored: boolean) => {
    await setSchedulerConfig(ignored ? { unignore_band: index } : { ignore_band: index });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Spectrum analyzer // 16 × 500 MHz hops</span>
        <span className={running ? "text-[#00ff66]" : "text-muted-foreground"}>
          {running ? "Hopping" : "Idle"}
        </span>
      </div>
      <div className="relative grid grid-cols-8 gap-1.5">
        {bands.map((band, index) => {
          const active = index === tuned;
          const live = band.status === "OCCUPIED" || band.status === "LOCKED";
          const high = band.threat_level === "HIGH";
          const height = Math.max(18, Math.min(100, band.priority_score * 100));
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
                "group relative flex h-36 flex-col justify-end overflow-hidden rounded-md border px-0.5 pb-1 pt-5 transition-colors",
                band.ignored
                  ? "border-dashed border-muted-foreground/50 bg-muted/40 opacity-50"
                  : "border-border bg-[#0d0d0d]",
                active && "ring-1 ring-[#00ff66]",
                high && live && "border-[#ff2a6d]/50",
              )}
              title={`Band ${String(band.band_id).padStart(2, "0")} · ${band.center_freq_mhz} MHz · click lock · right-click ignore`}
            >
              {active && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#00ff66] shadow-[0_0_10px_#00ff66]" />
              )}
              <span
                className={cn(
                  "w-full rounded-sm border border-white/10",
                  high ? "bg-[#ff2a6d]/80" : live ? "bg-[#a1a1aa]" : "bg-[#262626]",
                )}
                style={{ height: `${height}%` }}
              />
              <span className="mt-1 font-mono text-[8px] text-muted-foreground">
                {String(band.band_id).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Click a cell to lock (manual dwell). Right-click to ignore / restore. Green tick = current hop.
      </p>
    </div>
  );
}
