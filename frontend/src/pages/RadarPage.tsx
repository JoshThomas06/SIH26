import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { AiSummaryPanel } from "@/components/tactical/AiSummaryPanel";
import { BearingRangePanel } from "@/components/tactical/BearingRangePanel";
import { EnvKnobs } from "@/components/tactical/EnvKnobs";
import { ExplainableConsole } from "@/components/tactical/ExplainableConsole";
import { MetricsHUD } from "@/components/tactical/MetricsHUD";
import { PolarRadarScope } from "@/components/tactical/PolarRadarScope";
import { SchedulerModeToggle } from "@/components/tactical/SchedulerModeToggle";
import { SpectrumAnalyzer } from "@/components/tactical/SpectrumAnalyzer";
import { SpectrumWaterfall } from "@/components/tactical/SpectrumWaterfall";
import { ThreatMatrixTable } from "@/components/tactical/ThreatMatrixTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { commandSimulation } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useTacticalStore } from "@/store/useTacticalStore";

export default function ScanPage() {
  useTelemetrySocket();
  const running = useTacticalStore((s) => s.running);
  const connected = useTacticalStore((s) => s.isConnected);
  const mode = useTacticalStore((s) => s.schedulerMode);
  const sweep = useTacticalStore((s) => s.env.sweep_ms);
  const [view, setView] = useState<"polar" | "spectrum">("polar");
  const [clock, setClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background px-4 py-4 md:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              Smart Scan EW // Scan console
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{connected ? `Sweep ${sweep.toFixed(0)} ms` : "Disconnected"}</Badge>
              <Badge>{mode}</Badge>
              <Badge>Zulu {clock}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppNav />
            <Button
              variant={running ? "threat" : "phosphor"}
              size="sm"
              onClick={() => void commandSimulation(running ? "pause" : "start")}
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Halt" : "Initiate"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => void commandSimulation("reset")}>
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </header>

        <div className="mb-4">
          <SchedulerModeToggle />
        </div>

        <div className="mb-4">
          <EnvKnobs />
        </div>

        <div className="mb-3 flex gap-2">
          {(
            [
              ["polar", "CRT polar"],
              ["spectrum", "Spectrum analyzer"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "rounded-xl border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                view === id
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:border-[#525252]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {view === "polar" ? <PolarRadarScope /> : <SpectrumAnalyzer />}
            <SpectrumWaterfall />
            <BearingRangePanel />
          </div>
          <ThreatMatrixTable />
        </div>

        <div className="mt-3">
          <AiSummaryPanel title="AI summary of this scan session" />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ExplainableConsole />
          <MetricsHUD />
        </div>
      </div>
    </PageWrapper>
  );
}
