import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { App } from "../App";
import { FixedViewPage } from "../pages/FixedViewPage";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.(new CloseEvent("close"));
  }
}

function sendRealtimeEvent(socket: MockWebSocket, payload: { signal: string; value: number; ts_utc: string }) {
  socket.onmessage?.(
    new MessageEvent("message", {
      data: JSON.stringify(payload),
    }),
  );
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/dashboards/")) {
        const dashboardIdMatch = url.match(/\/api\/dashboards\/(\d+)/);
        const dashboardId = dashboardIdMatch ? Number(dashboardIdMatch[1]) : 1;
        const status = dashboardId === 2 ? "draft" : "published";

        return new Response(
          JSON.stringify({
            id: dashboardId,
            name: dashboardId === 2 ? "Draft dashboard" : "Published dashboard",
            description: "Read-only dashboard",
            pipeline: "realtime",
            status,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            widgets: [
              {
                id: 11,
                dashboard_id: dashboardId,
                name: "Realtime RPM",
                widget_type: "gauge",
                settings: {
                  chart_type: "gauge",
                  pipeline: "realtime",
                  signals: ["Gen_RPM"],
                },
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: 13,
                dashboard_id: dashboardId,
                name: "Realtime Power",
                widget_type: "smoothed_line",
                settings: {
                  chart_type: "smoothed_line",
                  pipeline: "realtime",
                  signals: ["Gen_Power"],
                },
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              {
                id: 12,
                dashboard_id: dashboardId,
                name: "Historian RPM",
                widget_type: "large_scale_area",
                settings: {
                  chart_type: "large_scale_area",
                  pipeline: "historian",
                  signals: ["Gen_RPM"],
                  range: {
                    from: "2026-07-12T00:00:00Z",
                    to: "2026-07-12T01:00:00Z",
                  },
                },
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/api/historian/series")) {
        return new Response(
          JSON.stringify({
            series: [{ signal: "Gen_RPM", value: 1250.5, ts_utc: "2026-07-12T00:15:00Z" }],
            bucket: "1m",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ detail: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows reconnecting state when websocket drops", async () => {
  render(<FixedViewPage dashboardId={1} />);

  await waitFor(() => {
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
  });

  MockWebSocket.instances[0].onopen?.(new Event("open"));
  expect(await screen.findByText(/realtime status: connected/i)).toBeInTheDocument();

  MockWebSocket.instances[0].close();

  expect(await screen.findByText(/realtime status: reconnecting/i)).toBeInTheDocument();
});

it("shows disconnected status and realtime badge only on realtime widgets", async () => {
  render(<FixedViewPage dashboardId={1} />);

  await waitFor(() => {
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
  });

  MockWebSocket.instances[0].onopen?.(new Event("open"));

  expect(await screen.findByText(/realtime status: connected/i)).toBeInTheDocument();
  expect(screen.getAllByText(/connection: connected/i)).toHaveLength(2);

  MockWebSocket.instances[0].onerror?.(new Event("error"));

  expect(await screen.findByText(/realtime status: disconnected/i)).toBeInTheDocument();
  expect(screen.getAllByText(/connection: disconnected/i)).toHaveLength(2);

  const historianHeading = screen.getByRole("heading", { name: /historian rpm/i });
  const historianWidget = historianHeading.closest("article");
  expect(historianWidget).not.toBeNull();
  expect(within(historianWidget as HTMLElement).queryByText(/connection:/i)).not.toBeInTheDocument();
});

it("shows publish warning and hides data for non-published dashboards", async () => {
  render(<FixedViewPage dashboardId={2} />);

  expect(await screen.findByText(/dashboard is not published yet\./i)).toBeInTheDocument();
  expect(screen.queryByText(/realtime status:/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /realtime rpm/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /historian rpm/i })).not.toBeInTheDocument();
  expect(MockWebSocket.instances).toHaveLength(0);
});

it("renders timestamps in local browser time for historian widgets", async () => {
  render(<FixedViewPage dashboardId={1} />);

  const expectedLocal = new Date("2026-07-12T00:15:00Z").toLocaleString();
  expect(await screen.findByText((content) => content.includes(expectedLocal))).toBeInTheDocument();
  expect(screen.queryByText(/2026-07-12T00:15:00Z/)).not.toBeInTheDocument();
});

it("keeps realtime points inside the last 15 minutes based on timestamps", async () => {
  render(<FixedViewPage dashboardId={1} />);

  await waitFor(() => {
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
  });

  const socket = MockWebSocket.instances[0];
  socket.onopen?.(new Event("open"));

  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 104, ts_utc: "2026-07-12T00:04:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 106, ts_utc: "2026-07-12T00:06:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 107, ts_utc: "2026-07-12T00:07:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 108, ts_utc: "2026-07-12T00:08:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 109, ts_utc: "2026-07-12T00:09:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 110, ts_utc: "2026-07-12T00:10:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 111, ts_utc: "2026-07-12T00:11:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 120, ts_utc: "2026-07-12T00:20:00Z" });

  await waitFor(() => {
    expect(screen.queryByText(/Gen_Power: 104/)).not.toBeInTheDocument();
    expect(screen.getByText(/Gen_Power: 106/)).toBeInTheDocument();
    expect(screen.getByText(/Gen_Power: 107/)).toBeInTheDocument();
  });
});

it("converts historian datetime-local range values to UTC before requesting series", async () => {
  const fetchCalls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchCalls.push(url);

      if (url.includes("/api/dashboards/")) {
        return new Response(
          JSON.stringify({
            id: 1,
            name: "Published dashboard",
            description: "Read-only dashboard",
            pipeline: "realtime",
            status: "published",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            widgets: [
              {
                id: 12,
                dashboard_id: 1,
                name: "Historian RPM",
                widget_type: "large_scale_area",
                settings: {
                  chart_type: "large_scale_area",
                  pipeline: "historian",
                  signals: ["Gen_RPM"],
                  range: {
                    from: "2026-07-12T02:30",
                    to: "2026-07-12T03:00",
                  },
                },
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/api/historian/series")) {
        return new Response(JSON.stringify({ series: [], bucket: "1m" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ detail: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );

  render(<FixedViewPage dashboardId={1} />);

  await waitFor(() => {
    expect(fetchCalls.some((url) => url.includes("/api/historian/series"))).toBe(true);
  });

  const historianUrl = fetchCalls.find((url) => url.includes("/api/historian/series"));
  expect(historianUrl).toBeDefined();

  const expectedFrom = encodeURIComponent(new Date("2026-07-12T02:30").toISOString());
  const expectedTo = encodeURIComponent(new Date("2026-07-12T03:00").toISOString());
  expect(historianUrl).toContain(`from=${expectedFrom}`);
  expect(historianUrl).toContain(`to=${expectedTo}`);
});

it("renders fixed route in app for /dashboards/:id", async () => {
  window.history.pushState({}, "Fixed", "/dashboards/1");

  render(<App />);

  expect(await screen.findByRole("heading", { name: /fixed dashboard/i })).toBeInTheDocument();
});

it("keeps /fixed/:id route for backwards compatibility", async () => {
  window.history.pushState({}, "Fixed", "/fixed/1");

  render(<App />);

  expect(await screen.findByRole("heading", { name: /fixed dashboard/i })).toBeInTheDocument();
});
