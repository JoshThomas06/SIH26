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
  const chatterLabel = chatter === "COLLECTING" ? "WARMING" : chatter;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        className={cn(
          posture === "CRITICAL" && "border-[#ff2a6d] text-[#ff2a6d]",
          posture === "HIGH" && "border-[#ff8a3d] text-[#ff8a3d]",
          posture === "MODERATE" && "border-amber-400 text-amber-300",
          posture === "LOW" && "border-[#00ff66]/50 text-[#00ff66]",
        )}
      >
        Threat {posture}
      </Badge>
      <Badge
        className={cn(
          chatterLabel === "ACTIVE" && "border-[#ff2a6d] text-[#ff2a6d]",
          chatterLabel === "FADING" && "border-[#00ff66]/50 text-[#00ff66]",
          (chatterLabel === "STABLE" || chatterLabel === "WARMING") && "text-zinc-300",
        )}
      >
        Chatter {chatterLabel}
      </Badge>
    </div>
  );
}
