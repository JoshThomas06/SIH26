import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const session = useTacticalStore((s) => s.pdHistory);
  const recent = useTacticalStore((s) => s.pdInstantHistory);
  const running = useTacticalStore((s) => s.running);
  const show = useInsightStore((s) => s.show);
  const data = session.map((pd, i) => ({
    i,
    session: pd,
    recent: recent[i] ?? 0,
  }));

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
        <button
          key={tile.label}
          type="button"
          className="sj-fill rounded-3xl border border-border bg-card p-3 text-left"
          onClick={() =>
            TILE_HELP[tile.label] &&
            show({
              title: tile.label,
              summary: TILE_HELP[tile.label].summary,
              detail: TILE_HELP[tile.label].detail,
            })
          }
        >
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-300">{tile.label}</div>
          <div className="mt-1 font-mono text-lg text-foreground">{tile.value}</div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-zinc-400">Open brief</p>
        </button>
      ))}
      <Card className="col-span-2 md:col-span-3 xl:col-span-6">
        <CardContent className="space-y-2 p-3 pt-3">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Pd trend (session vs recent window)</span>
            <span className={running ? "text-[#00ff66]" : ""}>
              {running ? "Live" : "Halted"} · {(metrics.pd * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-40">
            {data.length === 0 ? (
              <div className="flex h-full items-center text-xs text-muted-foreground">Awaiting samples…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.12} />
                  <XAxis dataKey="i" hide />
                  <YAxis domain={[0, 100]} width={32} stroke="currentColor" fontSize={10} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${Number(value ?? 0).toFixed(1)}%`,
                      name === "session" ? "Session Pd" : "Recent Pd",
                    ]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="session"
                    name="session"
                    stroke="#e4e4e7"
                    fill="#e4e4e7"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="recent"
                    name="recent"
                    stroke="#00ff66"
                    fill="#00ff66"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <ExplainCue
            title="Pd trend"
            summary="Grey is cumulative Pd for this run. Green is the last-tick hit rate so you can see Smart Scan vs open-loop while it is still running."
            detail="Session Pd is hits / (hits + misses) so far, so it moves slowly. Recent Pd is a rolling ~2 s intercept window, which is why it tracks Smart Scan vs open-loop without jumping 0–100 on every hop."
          />
        </CardContent>
      </Card>
    </div>
  );
}
