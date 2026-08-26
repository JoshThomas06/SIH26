import { useEffect } from "react";
import { useTacticalStore } from "@/store/useTacticalStore";

export function useTelemetrySocket() {
  const ingestPayload = useTacticalStore((s) => s.ingestPayload);
  const setTelemetry = useTacticalStore((s) => s.setTelemetry);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws/telemetry`;
    let closed = false;
    let ws: WebSocket | null = null;
    let retry: number | undefined;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onopen = () => setTelemetry({ isConnected: true });
      ws.onmessage = (event) => {
        try {
          ingestPayload(JSON.parse(event.data) as Record<string, unknown>);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        setTelemetry({ isConnected: false });
        if (!closed) retry = window.setTimeout(connect, 1200);
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      ws?.close();
    };
  }, [ingestPayload, setTelemetry]);
}
