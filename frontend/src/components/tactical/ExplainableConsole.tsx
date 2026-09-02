import { useTacticalStore } from "@/store/useTacticalStore";

export function ExplainableConsole() {
  const logs = useTacticalStore((s) => s.aiLogs);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#040404]">
      <div className="flex shrink-0 items-center justify-between border-b border-black px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span>Explainable MoE Terminal</span>
        <span>{logs.length} hops logged</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-color:#525252_#0d0d0d] [scrollbar-width:thin]">
        <div className="space-y-2 font-mono text-[11px] leading-relaxed text-[#c4c4c8]">
          {logs.length === 0 ? (
            <div className="text-[#666]">Awaiting scheduler rationale stream…</div>
          ) : (
            logs.map((line, i) => (
              <div
                key={`${i}-${line.slice(0, 48)}`}
                className="rounded-md border-l-2 border-[#262626] pl-2 transition-colors hover:border-[#00ff66] hover:bg-white/[0.03]"
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
