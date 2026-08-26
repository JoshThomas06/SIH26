import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setSchedulerConfig } from "@/lib/auth";
import { useTacticalStore, type TacticalState } from "@/store/useTacticalStore";

const MODES: { id: TacticalState["schedulerMode"]; title: string; copy: string }[] = [
  {
    id: "MANUAL",
    title: "Manual Dwell",
    copy: "Operator-selected sub-band lock.",
  },
  {
    id: "OPEN_LOOP",
    title: "Open-Loop Sweep",
    copy: "Sequential hop. Baseline failure mode.",
  },
  {
    id: "SMART_SCAN_MARL",
    title: "Smart Scan MARL",
    copy: "Eager + Revisit MoE with 850 ms AoI.",
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
    <div className="grid gap-2 md:grid-cols-3">
      {MODES.map((item) => (
        <Card
          key={item.id}
          className={mode === item.id ? "border-[#e4e4e7]" : "cursor-pointer hover:border-[#444]"}
        >
          <CardContent className="p-3 pt-3">
            <Button
              variant={mode === item.id ? "default" : "outline"}
              className="mb-2 w-full font-mono text-[10px] uppercase tracking-widest"
              onClick={() => void apply(item.id)}
            >
              {item.title}
            </Button>
            <p className="font-mono text-[10px] text-[#a1a1aa]">{item.copy}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
