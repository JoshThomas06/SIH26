import { Card, CardContent } from "@/components/ui/card";
import { useTacticalStore } from "@/store/useTacticalStore";

export function BearingRangePanel() {
  const pdws = useTacticalStore((s) => s.latestPDWs);
  const running = useTacticalStore((s) => s.running);

  return (
    <Card className="h-full overflow-auto rounded-none border-0">
      <CardContent className="p-3 pt-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Approximate geolocation from PDW
        </div>
        {pdws.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {running
              ? "Awaiting intercepts. Blips paint when the CRT sweep crosses their bearing."
              : "Initiate a session to estimate bearing and slant range from amplitude."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1">MHz</th>
                  <th>AoA</th>
                  <th>Compass</th>
                  <th>Range</th>
                  <th>Amp</th>
                </tr>
              </thead>
              <tbody>
                {pdws.map((pdw) => (
                  <tr key={pdw.trackId ?? pdw.pdw_id} className="border-t border-border text-foreground">
                    <td className="py-1.5">{pdw.center_freq_mhz.toFixed(0)}</td>
                    <td>{pdw.aoa_deg.toFixed(0)}°</td>
                    <td>{pdw.compass ?? "—"}</td>
                    <td>{pdw.range_km != null ? `${pdw.range_km.toFixed(1)} km` : "—"}</td>
                    <td>{pdw.amplitude_db.toFixed(1)} dB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Range is amplitude-derived slant estimate, not GPS. 0° AoA = North.
        </p>
      </CardContent>
    </Card>
  );
}
