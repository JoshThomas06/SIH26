import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { TopographicBackground } from "@/components/motion/TopographicBackground";
import { AiSummaryPanel } from "@/components/tactical/AiSummaryPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRunSession, listRunSessions, type RunSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useInsightStore } from "@/store/useInsightStore";

export default function AnalyticsPage() {
  const [cards, setCards] = useState<RunSession[]>([]);
  const [active, setActive] = useState<RunSession | null>(null);
  const show = useInsightStore((s) => s.show);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const { sessions } = await listRunSessions();
        if (!alive) return;
        setCards(sessions);
        setActive((current) => {
          if (current?.id && sessions.some((s) => s.id === current.id)) return current;
          return sessions[0] ?? null;
        });
      } catch {
        /* ignore */
      }
    };
    void pull();
    const id = window.setInterval(() => void pull(), 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!active?.id) return;
    void getRunSession(active.id).then(setActive).catch(() => undefined);
  }, [active?.id, active?.status, active?.sample_count]);

  const chart = useMemo(
    () =>
      (active?.samples ?? []).map((sample) => ({
        t: Number(sample.t.toFixed(1)),
        Pd: (sample.pd_window ?? sample.pd) * 100,
        Pfa: (sample.pfa_window ?? sample.pfa) * 100,
        PdCum: sample.pd * 100,
        PfaCum: sample.pfa * 100,
        Dt: sample.dt,
        Reward: sample.reward,
      })),
    [active?.samples],
  );

  return (
    <PageWrapper>
      <TopographicBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-zinc-400">Post-run intelligence</div>
            <h1 className="mt-1 text-2xl font-semibold">Analytics</h1>
          </div>
          <AppNav />
        </header>

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Run sessions</div>
            {cards.length === 0 ? (
              <Card>
                <CardContent className="p-4 pt-4 text-sm text-zinc-300">
                  No runs archived yet. Open Scan, press Initiate, then Halt to close a session.
                </CardContent>
              </Card>
            ) : (
              cards.map((card) => (
                <button
                  key={card.id || card.label}
                  type="button"
                  onClick={() => setActive(card)}
                  className={cn(
                    "w-full rounded-2xl border border-[#262626] bg-[#121212] p-3 text-left transition-colors hover:border-[#525252]",
                    active?.id === card.id && "border-[#e4e4e7] ring-1 ring-[#00ff66]/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white">{card.label}</span>
                    <Badge className="border-zinc-500 text-zinc-200">{card.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-400">{card.mode}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    Pd {((card.pd ?? 0) * 100).toFixed(1)}% · {card.flag_count ?? 0} flags
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-4">
            <AiSummaryPanel session={active} title="What these statistics are saying" />

            <Card>
              <CardContent className="h-64 p-4 pt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Recent Pd / Pfa vs time (s)
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={chart}>
                    <CartesianGrid stroke="#262626" />
                    <XAxis dataKey="t" stroke="#666" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#666" fontSize={10} />
                    <Tooltip
                      contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 12 }}
                    />
                    <Area type="monotone" dataKey="Pd" stroke="#00ff66" fill="#00ff66" fillOpacity={0.12} isAnimationActive={false} />
                    <Area type="monotone" dataKey="Pfa" stroke="#ff2a6d" fill="#ff2a6d" fillOpacity={0.08} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardContent className="h-52 p-4 pt-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">Δt and reward</div>
                  <ResponsiveContainer width="100%" height="88%">
                    <AreaChart data={chart}>
                      <CartesianGrid stroke="#262626" />
                      <XAxis dataKey="t" stroke="#666" fontSize={10} />
                      <YAxis yAxisId="dt" stroke="#666" fontSize={10} />
                      <YAxis yAxisId="rw" orientation="right" stroke="#888" fontSize={10} />
                      <Tooltip
                        contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 12 }}
                      />
                      <Area yAxisId="dt" type="monotone" dataKey="Dt" stroke="#e4e4e7" fill="#262626" isAnimationActive={false} />
                      <Area yAxisId="rw" type="monotone" dataKey="Reward" stroke="#f5b642" fill="transparent" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 pt-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    Flagged instances
                  </div>
                  <div className="aegis-scroll max-h-44 space-y-2 overflow-y-auto">
                    {(active?.flags ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-400">No flags on this run yet.</p>
                    ) : (
                      (active?.flags ?? []).map((flag) => (
                        <button
                          key={flag.id}
                          type="button"
                          className="block w-full rounded-xl border border-[#262626] p-2 text-left hover:border-[#525252]"
                          onClick={() =>
                            show({
                              title: flag.title,
                              summary: `${flag.severity} · t+${flag.t.toFixed(1)}s · band ${(flag.band ?? 0) + 1}`,
                              detail: flag.detail,
                            })
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-white">{flag.title}</span>
                            <span
                              className={cn(
                                "font-mono text-[10px]",
                                flag.severity === "HIGH" ? "text-[#ff2a6d]" : "text-zinc-300",
                              )}
                            >
                              {flag.severity}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
