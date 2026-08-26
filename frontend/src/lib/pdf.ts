import { jsPDF } from "jspdf";
import type { RunSession } from "@/lib/auth";

function wrap(doc: jsPDF, text: string, x: number, y: number, width: number) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * 6;
}

export function downloadSessionPdf(session: RunSession, kind: "summary" | "report") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const metrics = session.metrics_end || {};
  doc.setFillColor(4, 4, 4);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(228, 228, 231);
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.text("AEGIS EW-SCHEDULER", 16, 18);
  doc.setFontSize(10);
  doc.setTextColor(161, 161, 170);
  doc.text(`${kind === "summary" ? "SESSION SUMMARY" : "FULL RUN REPORT"}  //  ${session.label}`, 16, 26);
  doc.setDrawColor(38, 38, 38);
  doc.line(16, 30, 194, 30);

  doc.setTextColor(228, 228, 231);
  doc.setFontSize(11);
  let y = 40;
  y = wrap(
    doc,
    `Mode: ${session.mode}    Status: ${session.status}    Hits: ${metrics.hits ?? session.hits ?? 0}    Misses: ${metrics.misses ?? session.misses ?? 0}`,
    16,
    y,
    178,
  );
  y += 4;
  y = wrap(doc, session.summary || "No summary generated.", 16, y, 178);
  y += 6;

  if (kind === "report") {
    doc.setFont("courier", "bold");
    doc.text("Figures of merit", 16, y);
    y += 8;
    doc.setFont("courier", "normal");
    const pd = ((metrics.probability_of_detection ?? session.pd ?? 0) * 100).toFixed(1);
    const pfa = ((metrics.probability_of_false_alarm ?? 0) * 100).toFixed(1);
    y = wrap(
      doc,
      `Pd ${pd}%   Pfa ${pfa}%   Δt ${Number(metrics.avg_intercept_time_error_ms || 0).toFixed(1)} ms   Reward ${Number(metrics.current_reward_score || 0).toFixed(1)}`,
      16,
      y,
      178,
    );
    y += 6;
    doc.setFont("courier", "bold");
    doc.text("Flagged instances", 16, y);
    y += 8;
    doc.setFont("courier", "normal");
    const flags = session.flags?.slice(0, 12) ?? [];
    if (flags.length === 0) {
      y = wrap(doc, "No flagged events in this run.", 16, y, 178);
    } else {
      for (const flag of flags) {
        if (y > 270) {
          doc.addPage();
          doc.setFillColor(4, 4, 4);
          doc.rect(0, 0, 210, 297, "F");
          doc.setTextColor(228, 228, 231);
          y = 20;
        }
        y = wrap(doc, `t+${flag.t.toFixed(1)}s  [${flag.severity}]  ${flag.title}`, 16, y, 178);
        y = wrap(doc, flag.detail, 16, y, 178);
        y += 3;
      }
    }
    y += 4;
    if (y > 250) {
      doc.addPage();
      doc.setFillColor(4, 4, 4);
      doc.rect(0, 0, 210, 297, "F");
      y = 20;
    }
    doc.setFont("courier", "bold");
    doc.setTextColor(228, 228, 231);
    doc.text("MoE hop log (latest 18)", 16, y);
    y += 8;
    doc.setFont("courier", "normal");
    for (const line of (session.logs ?? []).slice(-18)) {
      if (y > 280) break;
      y = wrap(doc, line, 16, y, 178);
      y += 1;
    }
  }

  doc.save(`AEGIS-${session.label}-${kind}.pdf`);
}
