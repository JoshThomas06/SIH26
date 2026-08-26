import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useTacticalStore } from "@/store/useTacticalStore";

export function MetricsHUD() {
  const metrics = useTacticalStore((s) => s.metrics);
  const history = useTacticalStore((s) => s.pdHistory);
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
        <Card key={tile.label}>
          <CardContent className="p-3 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">{tile.label}</div>
            <div className="mt-1 font-mono text-lg text-white">{tile.value}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-3 xl:col-span-6">
        <CardContent className="h-24 p-2 pt-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">Pd trend</div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <Area type="monotone" dataKey="pd" stroke="#e4e4e7" fill="#262626" strokeWidth={1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
