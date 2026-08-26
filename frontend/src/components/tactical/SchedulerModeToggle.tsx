import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExplainCue } from "@/components/ui/insight-dialog";
import { setSchedulerConfig } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useTacticalStore, type TacticalState } from "@/store/useTacticalStore";

const MODES: {
  id: TacticalState["schedulerMode"];
  title: string;
  copy: string;
  summary: string;
  detail: string;
}[] = [
  {
    id: "MANUAL",
    title: "Manual Dwell",
    copy: "Operator-selected sub-band lock.",
    summary: "You pick the band. The receiver stays there.",
    detail: "Use this to stare at one of the 16 slices. Click a threat-matrix row to lock that band. Good for a known emitter; it will starve every other channel.",
  },
  {
    id: "OPEN_LOOP",
    title: "Open-Loop Sweep",
    copy: "Sequential hop. Baseline failure mode.",
    summary: "Walk bands 1→16 on a fixed loop. Agile radars slip through the gaps.",
    detail: "This is the demo baseline. The tuner always goes to the next neighbour. Hopping emitters that leave before we arrive are missed — Pd stays low.",
  },
  {
    id: "SMART_SCAN_MARL",
    title: "Smart Scan MARL",
    copy: "Eager + Revisit MoE with 850 ms AoI.",
    summary: "Two agents share the tuner: chase energy, and refresh stale bands.",
    detail: "Eager parks on occupied spectrum. Revisit interrupts if any band is older than 850 ms. That mix is the stand-in for later MARL, and it is what lifts Pd in the live demo.",
  },
];

export function SchedulerModeToggle() {
  const mode = useTacticalStore((s) => s.schedulerMode);
  const setSchedulerMode = useTacticalStore((s) => s.setSchedulerMode);

  const apply = async (next: TacticalState["schedulerMode"]) => {
    setSchedulerMode(next);
    await setSchedulerConfig({ mode: next });
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <motion.div key={item.id} whileHover={{ y: -3 }} transition={{ duration: 0.3 }}>
            <Card
              className={cn(
                "cursor-pointer transition-colors",
                active ? "border-[#e4e4e7] ring-1 ring-[#00ff66]/35" : "hover:border-[#525252]",
              )}
              onClick={() => void apply(item.id)}
            >
              <CardContent className="p-4 pt-4">
                <Button
                  variant={active ? "default" : "outline"}
                  className="mb-2 w-full font-mono text-[10px] uppercase tracking-widest"
                  onClick={(event) => {
                    event.stopPropagation();
                    void apply(item.id);
                  }}
                >
                  {item.title}
                </Button>
                <p className="mb-2 font-mono text-[10px] text-[#a1a1aa]">{item.copy}</p>
                <ExplainCue title={item.title} summary={item.summary} detail={item.detail} />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
