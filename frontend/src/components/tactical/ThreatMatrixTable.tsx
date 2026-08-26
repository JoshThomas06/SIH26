import { ScrollArea } from "@/components/ui/scroll-area";
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

  return (
    <div className="flex h-full flex-col border border-[#262626] bg-[#121212]">
      <div className="border-b border-[#262626] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        Threat Matrix // Sub-band Priorities
      </div>
      <ScrollArea className="h-[420px]">
        <table className="w-full text-left font-mono text-[10px]">
          <thead className="sticky top-0 bg-[#121212] text-[#666]">
            <tr>
              <th className="px-2 py-2">Band</th>
              <th>MHz</th>
              <th>AoI</th>
              <th>Pri</th>
              <th>State</th>
              <th>Threat</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band, i) => (
              <tr
                key={band.band_id}
                className={`border-t border-[#1a1a1a] ${i === tuned ? "bg-[#00ff66]/10" : ""}`}
              >
                <td className="px-2 py-1.5 text-white">{String(band.band_id).padStart(2, "0")}</td>
                <td>{band.center_freq_mhz}</td>
                <td>{band.aoi_ms.toFixed(0)}</td>
                <td>{band.priority_score.toFixed(2)}</td>
                <td className={i === tuned ? "text-[#00ff66]" : "text-[#a1a1aa]"}>{band.status}</td>
                <td className={TONE[band.threat_level]}>{band.threat_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
