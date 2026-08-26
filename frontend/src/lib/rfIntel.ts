import type { BandState, RfSnap } from "@/store/useTacticalStore";

export function exportRfHistoryCsv(history: RfSnap[]) {
  if (history.length === 0) return;
  const headers = ["Timestamp"];
  for (let i = 1; i <= 16; i++) {
    headers.push(`Band_${String(i).padStart(2, "0")}_State`);
    headers.push(`Band_${String(i).padStart(2, "0")}_Threat`);
  }
  const rows = [...history].reverse().map((row) => {
    const stamp = new Date(row.t).toISOString();
    const cells = row.cells.flatMap((cell) => [cell.status, cell.threat]);
    return [stamp, ...cells].join(",");
  });
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis_rf_history_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function chatterTrend(history: RfSnap[]) {
  if (history.length < 8) return "COLLECTING";
  const recent = history.slice(0, 10);
  const older = history.slice(10, 20);
  if (older.length === 0) return "STABLE";
  const avg = (rows: RfSnap[]) =>
    rows.reduce(
      (sum, row) => sum + row.cells.filter((cell) => cell.threat === "HIGH" && cell.status !== "IDLE").length,
      0,
    ) / rows.length;
  const delta = avg(recent) - avg(older);
  if (delta > 0.35) return "INCREASING";
  if (delta < -0.35) return "DECREASING";
  return "STABLE";
}

export function threatPosture(bands: BandState[], spawn: number) {
  const hot = bands.filter((band) => band.threat_level === "HIGH" && band.status !== "IDLE").length;
  if (spawn >= 0.7 || hot >= 3) return "CRITICAL";
  if (spawn >= 0.3 || hot >= 1) return "MODERATE";
  return "NOMINAL";
}
