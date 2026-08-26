import { ScrollArea } from "@/components/ui/scroll-area";
import { useTacticalStore } from "@/store/useTacticalStore";

export function ExplainableConsole() {
  const logs = useTacticalStore((s) => s.aiLogs);

  return (
    <div className="flex h-full min-h-48 flex-col border border-[#262626] bg-[#040404]">
      <div className="border-b border-[#262626] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        Explainable MoE Terminal
      </div>
      <ScrollArea className="h-48 p-3">
        <div className="space-y-2 font-mono text-[11px] leading-relaxed text-[#c4c4c8]">
          {logs.length === 0 ? (
            <div className="text-[#666]">Awaiting scheduler rationale stream…</div>
          ) : (
            logs.map((line, i) => (
              <div key={`${i}-${line.slice(0, 24)}`} className="border-l border-[#262626] pl-2">
                {line}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
