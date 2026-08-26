import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useInsightStore } from "@/store/useInsightStore";

export function InsightDialog() {
  const open = useInsightStore((s) => s.open);
  const title = useInsightStore((s) => s.title);
  const summary = useInsightStore((s) => s.summary);
  const detail = useInsightStore((s) => s.detail);
  const hide = useInsightStore((s) => s.hide);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close explanation"
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            onClick={hide}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="insight-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-[#121212]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff66]">Operator brief</p>
                <h2 id="insight-title" className="mt-1 text-xl font-semibold text-white">
                  {title}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={hide} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>
            <p className="text-sm leading-relaxed text-[#e4e4e7]">{summary}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-[#c4c4c8]">
              {detail}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ExplainCue({
  title,
  summary,
  detail,
}: {
  title: string;
  summary: string;
  detail: string;
}) {
  const show = useInsightStore((s) => s.show);
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-[#a1a1aa]">{summary}</p>
      <button
        type="button"
        className="font-mono text-[10px] uppercase tracking-widest text-[#888] underline-offset-4 hover:text-white hover:underline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          show({ title, summary, detail });
        }}
      >
        Open brief
      </button>
    </div>
  );
}
