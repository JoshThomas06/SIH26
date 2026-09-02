import { motion } from "framer-motion";

export function TerminalLoader({
  progress = 82,
  label = "TSDR BENCHMARK INGESTION STATUS",
}: {
  progress?: number;
  label?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#262626] bg-[#121212] p-4 transition-colors hover:border-[#525252]">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]">
        <span>{label}</span>
        <span className="text-white">{progress}%</span>
      </div>
      <div className="flex h-8 items-end gap-[3px]">
        {Array.from({ length: 32 }).map((_, i) => {
          const active = i < Math.round((progress / 100) * 32);
          const threat = i % 4 === 3;
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-sm"
              animate={
                active
                  ? { height: [`${28 + (i % 5) * 8}%`, `${42 + (i % 4) * 10}%`, `${28 + (i % 5) * 8}%`] }
                  : { height: `${24 + (i % 3) * 6}%` }
              }
              transition={{ duration: 1.1 + (i % 6) * 0.12, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: !active ? "#1a1a1a" : threat ? "#ff2a6d" : "#e4e4e7",
                boxShadow: active && threat ? "0 0 8px rgba(255,42,109,0.7)" : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[#666]">
        Initializing MARL scheduler engine
      </div>
    </div>
  );
}
