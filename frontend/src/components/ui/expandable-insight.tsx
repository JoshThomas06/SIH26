import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExplainToggle({
  open,
  summary,
  detail,
}: {
  open: boolean;
  summary: string;
  detail: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-[#a1a1aa]">{summary}</p>
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#888]">
        {open ? "Hide detail" : "Tap for plain-language detail"}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-l-2 border-[#00ff66]/40 pl-3 text-xs leading-relaxed text-[#e4e4e7]"
          >
            {detail}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
