import { useState } from "react";
import { setSchedulerConfig } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { IDLE_BANDS, useTacticalStore } from "@/store/useTacticalStore";

const TONE: Record<string, string> = {
  HIGH: "text-[#ff2a6d]",
  MEDIUM: "text-foreground",
  LOW: "text-zinc-300",
  NONE: "text-zinc-400",
};

export function ThreatMatrixTable() {
  const live = useTacticalStore((s) => s.bandStates);
  const bands = live.length === 16 ? live : IDLE_BANDS;
  const tuned = useTacticalStore((s) => s.activeTunedBand);
  const setSchedulerMode = useTacticalStore((s) => s.setSchedulerMode);
  const [selected, setSelected] = useState<number | null>(null);

  const lockBand = async (index: number) => {
    setSelected(index);
    setSchedulerMode("MANUAL");
    await setSchedulerConfig({ mode: "MANUAL", manual_band: index });
  };

  const selectedBand = selected != null ? bands[selected] : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <div className="shrink-0 border-b border-black px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-300">
        Threat Matrix // Sub-band Priorities
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <table className="w-full text-left font-mono text-[10px] text-foreground">
          <thead className="sticky top-0 bg-card text-zinc-300">
            <tr>
              <th className="px-2 py-2">Band</th>
              <th>MHz</th>
              <th>AoI</th>
              <th>Pri</th>
              <th>State</th>
              <th>Threat</th>
              <th>Skip</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, i) => (
              <tr
                key={band.band_id}
                onClick={() => void lockBand(i)}
                className={cn(
                  "cursor-pointer border-t border-black/60 transition-colors hover:bg-white/5",
                  i === tuned && "bg-[#00ff66]/10",
                  band.threat_level === "HIGH" && "bg-[#ff2a6d]/10",
                  band.ignored && "opacity-50",
                  selected === i && "ring-1 ring-inset ring-white/20",
                )}
              >
                <td className="px-2 py-1.5 font-semibold">{String(band.band_id).padStart(2, "0")}</td>
                <td>{band.center_freq_mhz}</td>
                <td>{band.aoi_ms.toFixed(0)}</td>
                <td>{band.priority_score.toFixed(2)}</td>
                <td className={i === tuned ? "text-[#00ff66]" : "text-zinc-300"}>{band.status}</td>
                <td className={TONE[band.threat_level]}>{band.threat_level}</td>
                <td>
                  <button
                    type="button"
                    className="sj-fill rounded border border-zinc-600 px-1 text-[9px] uppercase tracking-widest text-zinc-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      void setSchedulerConfig(band.ignored ? { unignore_band: i } : { ignore_band: i });
                    }}
                  >
                    {band.ignored ? "Restore" : "Ignore"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-black px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
        {selectedBand ? (
          <>
            Band {String(selectedBand.band_id).padStart(2, "0")} locked for manual dwell.
            {selectedBand.threat_level === "HIGH"
              ? " This slice is a high-priority emitter (periodic / agile / short-pulse)."
              : " AoI is how stale this slice is; HIGH rows are the ones Smart Scan must not starve."}
          </>
        ) : (
          "Click a row to lock (manual dwell). Ignore skips the band in Linear and Smart Scan."
        )}
      </div>
    </div>
  );
}
