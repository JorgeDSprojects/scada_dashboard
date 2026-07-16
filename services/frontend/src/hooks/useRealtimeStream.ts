import React from "react";

import { buildWebSocketUrl } from "../api/client";

export type RealtimeConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type RealtimeEvent = {
  signal: string;
  value: number;
  ts_utc: string;
};

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

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

    setStatus("reconnecting");
    setEvents([]);

    let retryTimer: number | undefined;
    let socket: WebSocket | undefined;
    let active = true;
    let reconnectAttempt = 0;

    const connect = () => {
      if (!active) {
        return;
      }

      socket = new WebSocket(buildWebSocketUrl(`/ws/realtime?dashboard_id=${dashboardId}`));
      socket.onopen = () => {
        if (active) {
          reconnectAttempt = 0;
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
        const retryDelay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
        reconnectAttempt += 1;
        retryTimer = window.setTimeout(connect, retryDelay);
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
