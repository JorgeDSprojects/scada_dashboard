import React from "react";

export type RealtimeConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type RealtimeEvent = {
  signal: string;
  value: number;
  ts_utc: string;
};

function parseEvent(payload: unknown): RealtimeEvent | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.signal !== "string" ||
    typeof candidate.value !== "number" ||
    typeof candidate.ts_utc !== "string"
  ) {
    return null;
  }

  return {
    signal: candidate.signal,
    value: candidate.value,
    ts_utc: candidate.ts_utc,
  };
}

export function useRealtimeStream(dashboardId: number | null) {
  const [status, setStatus] = React.useState<RealtimeConnectionStatus>("reconnecting");
  const [events, setEvents] = React.useState<RealtimeEvent[]>([]);

  React.useEffect(() => {
    if (dashboardId === null || dashboardId <= 0) {
      setStatus("disconnected");
      setEvents([]);
      return;
    }

    let retryTimer: number | undefined;
    let socket: WebSocket | undefined;
    let active = true;

    const connect = () => {
      if (!active) {
        return;
      }

      socket = new WebSocket(`/ws/realtime?dashboard_id=${dashboardId}`);
      socket.onopen = () => {
        if (active) {
          setStatus("connected");
        }
      };
      socket.onmessage = (event) => {
        if (!active) {
          return;
        }

        try {
          const parsed = parseEvent(JSON.parse(event.data));
          if (parsed) {
            setEvents((previous) => [...previous.slice(-99), parsed]);
          }
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        if (!active) {
          return;
        }

        setStatus("reconnecting");
        retryTimer = window.setTimeout(connect, 1000);
      };
      socket.onerror = () => {
        if (active) {
          setStatus("disconnected");
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
      socket?.close();
    };
  }, [dashboardId]);

  return { status, events };
}
