import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/dashboards/")) {
        return new Response(
          JSON.stringify({
            id: 1,
            name: "Published dashboard",
            description: "Read-only dashboard",
            pipeline: "realtime",
            status: "published",
            widgets: [
              {
                id: 11,
                dashboard_id: 1,
                name: "Realtime RPM",
                widget_type: "gauge",
                settings: {
                  chart_type: "gauge",
                  pipeline: "realtime",
                  signals: ["Gen_RPM"],
                },
              },
              {
                id: 12,
                dashboard_id: 1,
                name: "Historian RPM",
                widget_type: "line",
                settings: {
                  chart_type: "line",
                  pipeline: "historian",
                  signals: ["Gen_RPM"],
                  range: {
                    from: "2026-07-12T00:00:00Z",
                    to: "2026-07-12T01:00:00Z",
                  },
                },
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

it("renders fixed route in app for /fixed/:id", async () => {
  window.history.pushState({}, "Fixed", "/fixed/1");

  render(<App />);

  expect(await screen.findByRole("heading", { name: /fixed dashboard/i })).toBeInTheDocument();
});
