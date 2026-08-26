import { useEffect } from "react";
import { useTacticalStore } from "@/store/useTacticalStore";

async function pullTelemetry() {
  const res = await fetch("/api/v1/telemetry");
  if (!res.ok) throw new Error("telemetry");
  return (await res.json()) as Record<string, unknown>;
}

export function useTelemetrySocket() {
  const ingestPayload = useTacticalStore((s) => s.ingestPayload);
  const setTelemetry = useTacticalStore((s) => s.setTelemetry);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/ws/telemetry`;
    let closed = false;
    let ws: WebSocket | null = null;
    let retry: number | undefined;
    let poll: number | undefined;

    const ingest = (raw: Record<string, unknown>) => {
      ingestPayload(raw);
      setTelemetry({ isConnected: true });
    };

    const startPoll = () => {
      if (poll != null) return;
      const tick = async () => {
        if (closed) return;
        try {
          ingest(await pullTelemetry());
        } catch {
          setTelemetry({ isConnected: false });
        }
      };
      void tick();
      poll = window.setInterval(() => void tick(), 400);
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        startPoll();
        if (!closed) retry = window.setTimeout(connect, 1500);
        return;
      }
      ws.onopen = () => {
        if (poll != null) {
          window.clearInterval(poll);
          poll = undefined;
        }
        setTelemetry({ isConnected: true });
      };
      ws.onmessage = (event) => {
        try {
          ingest(JSON.parse(event.data) as Record<string, unknown>);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        startPoll();
        retry = window.setTimeout(connect, 1500);
      };
    };

    connect();
    startPoll();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      if (poll != null) window.clearInterval(poll);
      ws?.close();
    };
  }, [ingestPayload, setTelemetry]);
}
