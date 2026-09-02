import { useEffect, useState } from "react";
import { Expand, Pause, Play, Radio, RotateCcw, ShieldCheck, Signal, Wifi } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { AiSummaryPanel } from "@/components/tactical/AiSummaryPanel";
import { BearingRangePanel } from "@/components/tactical/BearingRangePanel";
import { ComponentsPanel, ScanBoard } from "@/components/tactical/ScanBoard";
import { EnvKnobs } from "@/components/tactical/EnvKnobs";
import { ExplainableConsole } from "@/components/tactical/ExplainableConsole";
import { MetricsHUD } from "@/components/tactical/MetricsHUD";
import { PolarRadarScope } from "@/components/tactical/PolarRadarScope";
import { SchedulerModeToggle } from "@/components/tactical/SchedulerModeToggle";
import { SpectrumAnalyzer } from "@/components/tactical/SpectrumAnalyzer";
import { SpectrumWaterfall } from "@/components/tactical/SpectrumWaterfall";
import { TacticalIntel } from "@/components/tactical/TacticalIntel";
import { TacticalIntelPanel } from "@/components/tactical/TacticalIntelPanel";
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
  const env = useTacticalStore((s) => s.env);
  const activeBand = useTacticalStore((s) => s.activeTunedBand);
  const bandStates = useTacticalStore((s) => s.bandStates);
  const tracks = useTacticalStore((s) => s.latestPDWs);
  const ignoredBands = useTacticalStore((s) => s.ignoredBands);
  const [fullscreen, setFullscreen] = useState(false);
  const [clock, setClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        void commandSimulation(running ? "pause" : "start");
      }
      if (event.key.toLowerCase() === "r") void commandSimulation("reset");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [running]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background px-4 py-4 md:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-black pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              Smart Scan EW // Scan console
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{connected ? `Sweep ${env.sweep_ms.toFixed(0)} ms · ${env.sim_speed.toFixed(2)}×` : "Disconnected"}</Badge>
              <Badge>{mode}</Badge>
              <Badge>Zulu {clock}</Badge>
              <TacticalIntel />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppNav />
            <ComponentsPanel />
            <Button
              variant={running ? "threat" : "phosphor"}
              size="sm"
              className={running ? undefined : "sj-fill sj-fill-phosphor"}
              onClick={() => void commandSimulation(running ? "pause" : "start")}
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Halt" : "Initiate"}
            </Button>
            <Button variant="outline" size="icon" className="sj-fill" onClick={() => void commandSimulation("reset")}>
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="sj-fill"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Expand className="size-4" />
            </Button>
          </div>
        </header>

        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card/75 px-3 py-2 backdrop-blur-sm transition-colors hover:border-[#31503d]">
            <div className="flex items-center gap-2">
              <Wifi className={cn("size-4", connected ? "text-[#00ff66]" : "text-[#ff2a6d]")} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Link</span>
            </div>
            <span className={cn("font-mono text-xs", connected ? "text-[#7dffa9]" : "text-[#ff739d]")}>
              {connected ? "NOMINAL" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/75 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-[#f5b642]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tuned band</span>
            </div>
            <span className="font-mono text-xs text-[#f5c86e]">BAND {String(activeBand + 1).padStart(2, "0")}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/75 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Signal className="size-4 text-[#7dffa9]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tracks</span>
            </div>
            <span className="font-mono text-xs text-foreground">{tracks.length} ACTIVE</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/75 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-zinc-300" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Coverage</span>
            </div>
            <span className="font-mono text-xs text-foreground">{Math.max(0, bandStates.length - ignoredBands.length)}/16</span>
          </div>
        </div>

        <div className="mb-4">
          <SchedulerModeToggle />
        </div>

        <div className="mb-4">
          <EnvKnobs />
        </div>

        <ScanBoard
          widgets={{
            crt: <PolarRadarScope />,
            spectrum: <SpectrumAnalyzer />,
            waterfall: <SpectrumWaterfall />,
            matrix: <ThreatMatrixTable />,
            bearing: <BearingRangePanel />,
            summary: (
              <div className="h-full overflow-auto">
                <AiSummaryPanel title="AI summary of this scan session" />
              </div>
            ),
            intel: <TacticalIntelPanel />,
            console: <ExplainableConsole />,
            metrics: (
              <div className="h-full overflow-auto p-2">
                <MetricsHUD />
              </div>
            ),
          }}
        />
      </div>
    </PageWrapper>
  );
}
