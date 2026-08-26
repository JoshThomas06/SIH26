import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { setSchedulerConfig } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useTacticalStore } from "@/store/useTacticalStore";

const TONE: Record<string, string> = {
  HIGH: "text-[#ff2a6d]",
  MEDIUM: "text-[#e4e4e7]",
  LOW: "text-[#a1a1aa]",
  NONE: "text-[#666]",
};

export function ThreatMatrixTable() {
  const bands = useTacticalStore((s) => s.bandStates);
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#262626] bg-[#121212] transition-colors hover:border-[#3f3f46]">
      <div className="border-b border-[#262626] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        Threat Matrix // Sub-band Priorities
      </div>
      <ScrollArea className="h-[360px]">
        <table className="w-full text-left font-mono text-[10px]">
          <thead className="sticky top-0 bg-[#121212] text-[#666]">
            <tr>
              <th className="px-2 py-2">Band</th>
              <th>MHz</th>
              <th>AoI</th>
              <th>Pri</th>
              <th>State</th>
              <th>Threat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, i) => (
              <tr
                key={band.band_id}
                onClick={() => void lockBand(i)}
                className={cn(
                  "cursor-pointer border-t border-[#1a1a1a] transition-colors hover:bg-white/5",
                  i === tuned && "bg-[#00ff66]/10",
                  band.threat_level === "HIGH" && "bg-[#ff2a6d]/10",
                  band.ignored && "opacity-40",
                  selected === i && "ring-1 ring-inset ring-white/20",
                )}
              >
                <td className="px-2 py-1.5 text-foreground">{String(band.band_id).padStart(2, "0")}</td>
                <td>{band.center_freq_mhz}</td>
                <td>{band.aoi_ms.toFixed(0)}</td>
                <td>{band.priority_score.toFixed(2)}</td>
                <td className={i === tuned ? "text-[#00ff66]" : "text-muted-foreground"}>{band.status}</td>
                <td className={TONE[band.threat_level]}>{band.threat_level}</td>
                <td>
                  <button
                    type="button"
                    className="rounded border border-border px-1 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
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
      </ScrollArea>
      <div className="border-t border-[#262626] px-3 py-2 text-[11px] leading-relaxed text-[#a1a1aa]">
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
