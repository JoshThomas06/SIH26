import { chatterTrend, threatPosture } from "@/lib/rfIntel";
import { useTacticalStore } from "@/store/useTacticalStore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TacticalIntel() {
  const bands = useTacticalStore((s) => s.bandStates);
  const spawn = useTacticalStore((s) => s.env.hostile_spawn);
  const history = useTacticalStore((s) => s.rfHistory);
  const posture = threatPosture(bands, spawn);
  const chatter = chatterTrend(history);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        className={cn(
          posture === "CRITICAL" && "border-[#ff2a6d] text-[#ff2a6d]",
          posture === "MODERATE" && "border-amber-400 text-amber-300",
          posture === "NOMINAL" && "border-[#00ff66]/50 text-[#00ff66]",
        )}
      >
        Threat {posture}
      </Badge>
      <Badge
        className={cn(
          chatter === "INCREASING" && "border-[#ff2a6d] text-[#ff2a6d]",
          chatter === "DECREASING" && "border-[#00ff66]/50 text-[#00ff66]",
          (chatter === "STABLE" || chatter === "COLLECTING") && "text-zinc-300",
        )}
      >
        Chatter {chatter}
      </Badge>
    </div>
  );
}
