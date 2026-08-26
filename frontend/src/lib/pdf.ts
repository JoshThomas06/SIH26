import { jsPDF } from "jspdf";
import type { RunSession } from "@/lib/auth";

function toPdfText(value: string) {
  return value
    .replaceAll("Δ", "d")
    .replaceAll("·", " | ")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("≥", ">=")
    .replaceAll("×", "x")
    .replace(/[^\t\n\r\x20-\x7E]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function paintPage(doc: jsPDF) {
  doc.setFillColor(12, 12, 14);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(228, 228, 231);
}

function writeLines(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5.4) {
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(toPdfText(text), maxWidth) as string[];
  for (const line of lines) {
    if (y > 278) {
      doc.addPage();
      paintPage(doc);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = 18;
    }
    doc.text(line, x, y, { align: "left", baseline: "top" });
    y += lineHeight;
  }
  return y;
}

export function downloadSessionPdf(session: RunSession, kind: "summary" | "report") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const metrics = session.metrics_end || {};
  paintPage(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AEGIS EW-Scheduler", 16, 16, { baseline: "top" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 186);
  doc.text(
    toPdfText(`${kind === "summary" ? "Session summary" : "Full run report"}  //  ${session.label}`),
    16,
    24,
    { baseline: "top" },
  );
  doc.setDrawColor(60, 60, 64);
  doc.line(16, 32, 194, 32);

  doc.setTextColor(228, 228, 231);
  doc.setFontSize(10);
  let y = 38;
  const hits = metrics.hits ?? session.hits ?? 0;
  const misses = metrics.misses ?? session.misses ?? 0;
  y = writeLines(
    doc,
    `Mode: ${session.mode}   Status: ${session.status}   Hits: ${hits}   Misses: ${misses}`,
    16,
    y,
    178,
  );
  y += 4;
  y = writeLines(doc, session.summary || "No summary generated.", 16, y, 178, 5.6);
  y += 6;

  if (kind === "report") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Figures of merit", 16, y, { baseline: "top" });
    y += 8;
    doc.setFontSize(10);
    const pd = ((metrics.probability_of_detection ?? session.pd ?? 0) * 100).toFixed(1);
    const pfa = ((metrics.probability_of_false_alarm ?? 0) * 100).toFixed(1);
    y = writeLines(
      doc,
      `Pd ${pd}%    Pfa ${pfa}%    dt ${Number(metrics.avg_intercept_time_error_ms || 0).toFixed(1)} ms    Reward ${Number(metrics.current_reward_score || 0).toFixed(1)}`,
      16,
      y,
      178,
    );
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Flagged instances", 16, y, { baseline: "top" });
    y += 8;
    doc.setFontSize(10);
    const flags = session.flags?.slice(0, 12) ?? [];
    if (flags.length === 0) {
      y = writeLines(doc, "No flagged events in this run.", 16, y, 178);
    } else {
      for (const flag of flags) {
        y = writeLines(doc, `t+${flag.t.toFixed(1)}s  [${flag.severity}]  ${flag.title}`, 16, y, 178);
        y = writeLines(doc, flag.detail, 16, y, 178);
        y += 3;
      }
    }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(228, 228, 231);
    doc.text("MoE hop log (latest 18)", 16, y, { baseline: "top" });
    y += 8;
    doc.setFontSize(9);
    for (const line of (session.logs ?? []).slice(-18)) {
      y = writeLines(doc, line, 16, y, 178, 4.8);
      y += 0.6;
    }
  }

  doc.save(`AEGIS-${session.label}-${kind}.pdf`);
}
