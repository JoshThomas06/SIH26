import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentRunSession, type RunSession } from "@/lib/auth";
import { downloadSessionPdf } from "@/lib/pdf";
import { useInsightStore } from "@/store/useInsightStore";

export function AiSummaryPanel({
  title = "AI session summary",
  session: provided,
}: {
  title?: string;
  session?: RunSession | null;
}) {
  const [session, setSession] = useState<RunSession | null>(provided ?? null);
  const show = useInsightStore((s) => s.show);

  useEffect(() => {
    if (provided) {
      setSession(provided);
      return;
    }
    let alive = true;
    const pull = () => {
      void getCurrentRunSession()
        .then((data) => {
          if (alive) setSession(data);
        })
        .catch(() => undefined);
    };
    pull();
    const id = window.setInterval(pull, 2500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provided]);

  const text = session?.summary || "Initiate a run to generate a live summary of Pd, misses, and scheduler behaviour.";

  return (
    <Card>
      <CardContent className="space-y-3 p-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff66]">{session?.label || "NO-RUN"}</div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!session?.id}
              onClick={() => session && downloadSessionPdf(session, "summary")}
            >
              <Download className="size-3.5" />
              Summary PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!session?.id}
              onClick={() => session && downloadSessionPdf(session, "report")}
            >
              <Download className="size-3.5" />
              Full report
            </Button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[#c4c4c8]">{text}</p>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-widest text-[#888] hover:text-white"
          onClick={() =>
            show({
              title: "How to read this summary",
              summary: "The paragraph is a heuristic brief of the current or last run — not a remote LLM.",
              detail: "It combines Pd, Pfa, Δt, hits/misses, mode, and flagged events. Use Summary PDF for a one-pager; Full report adds flags and the MoE hop log.",
            })
          }
        >
          How this brief is written
        </button>
      </CardContent>
    </Card>
  );
}
