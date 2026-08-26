import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { AiSummaryPanel } from "@/components/tactical/AiSummaryPanel";
import { ExplainableConsole } from "@/components/tactical/ExplainableConsole";
import { MetricsHUD } from "@/components/tactical/MetricsHUD";
import { PolarRadarScope } from "@/components/tactical/PolarRadarScope";
import { SchedulerModeToggle } from "@/components/tactical/SchedulerModeToggle";
import { SpectrumWaterfall } from "@/components/tactical/SpectrumWaterfall";
import { ThreatMatrixTable } from "@/components/tactical/ThreatMatrixTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { commandSimulation } from "@/lib/auth";
import { useTacticalStore } from "@/store/useTacticalStore";

export default function RadarPage() {
  useTelemetrySocket();
  const running = useTacticalStore((s) => s.running);
  const connected = useTacticalStore((s) => s.isConnected);
  const mode = useTacticalStore((s) => s.schedulerMode);
  const [clock, setClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#040404] px-4 py-4 md:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#a1a1aa]">
              Smart Scan EW // Tactical C2
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{connected ? "Sim 20 Hz · display 5 Hz" : "Disconnected"}</Badge>
              <Badge>{mode}</Badge>
              <Badge>Zulu {clock}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppNav />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Home</Link>
            </Button>
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

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <PolarRadarScope />
            <SpectrumWaterfall />
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
