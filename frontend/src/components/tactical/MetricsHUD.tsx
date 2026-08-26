import { Card, CardContent } from "@/components/ui/card";
import { ExplainCue } from "@/components/ui/insight-dialog";
import { useInsightStore } from "@/store/useInsightStore";
import { useTacticalStore } from "@/store/useTacticalStore";

const TILE_HELP: Record<string, { summary: string; detail: string }> = {
  Pd: {
    summary: "Catch rate on real emitters.",
    detail: "Probability of detection versus stare-mode truth. Smart Scan should climb well above open-loop once Initiate is running.",
  },
  Pfa: {
    summary: "How often we ‘see’ a signal that is not there.",
    detail: "False-alarm rate. Idle dwells can inflate this; treat it as a cost, not a trophy.",
  },
  "Δt intercept": {
    summary: "Average delay before we land on the pulse.",
    detail: "Lower is better. Open-loop often waits a full hop cycle; Smart Scan cuts that lag.",
  },
  Reward: {
    summary: "Scheduler score this run.",
    detail: "Hits add, misses and long hops subtract. Use it to show open-loop vs Smart Scan in the demo.",
  },
  Hits: {
    summary: "Pulses intercepted while tuned to that band.",
    detail: "A hit is a true intercept. Compare this count after ~30 seconds in each mode.",
  },
  Misses: {
    summary: "Emitters active while we were looking elsewhere.",
    detail: "Open-loop piles these up. Revisit + Eager should flatten the miss curve.",
  },
};

export function MetricsHUD() {
  const metrics = useTacticalStore((s) => s.metrics);
  const history = useTacticalStore((s) => s.pdHistory);
  const show = useInsightStore((s) => s.show);
  const data = history.map((pd, i) => ({ i, pd: pd * 100 }));

  const tiles = [
    { label: "Pd", value: `${(metrics.pd * 100).toFixed(1)}%` },
    { label: "Pfa", value: `${(metrics.pfa * 100).toFixed(1)}%` },
    { label: "Δt intercept", value: `${metrics.avgInterceptErrorMs.toFixed(1)} ms` },
    { label: "Reward", value: metrics.reward.toFixed(1) },
    { label: "Hits", value: String(metrics.hits) },
    { label: "Misses", value: String(metrics.misses) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          className="cursor-pointer transition-colors hover:border-[#525252]"
          onClick={() =>
            TILE_HELP[tile.label] &&
            show({
              title: tile.label,
              summary: TILE_HELP[tile.label].summary,
              detail: TILE_HELP[tile.label].detail,
            })
          }
        >
          <CardContent className="p-3 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">{tile.label}</div>
            <div className="mt-1 font-mono text-lg text-white">{tile.value}</div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#555]">Open brief</p>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-3 xl:col-span-6">
        <CardContent className="space-y-3 p-3 pt-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">Pd trend</div>
          <div className="flex h-16 items-end gap-0.5">
            {data.length === 0 ? (
              <div className="text-xs text-[#666]">Awaiting samples…</div>
            ) : (
              data.map((point) => (
                <div
                  key={point.i}
                  className="flex-1 rounded-sm bg-[#e4e4e7]"
                  style={{ height: `${Math.max(6, point.pd)}%`, opacity: 0.35 + (point.pd / 100) * 0.65 }}
                />
              ))
            )}
          </div>
          <ExplainCue
            title="Pd trend"
            summary="This strip is Pd over the last ~20 seconds of this run."
            detail="Each bar is a downsampled sample. Compare a Smart Scan run against an open-loop run on the Analytics page for the same window."
          />
        </CardContent>
      </Card>
    </div>
  );
}
