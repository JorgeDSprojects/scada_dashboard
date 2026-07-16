import "@testing-library/jest-dom/vitest";

import React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const echartsSpies = vi.hoisted(() => ({
  init: vi.fn(),
  setOption: vi.fn(),
  dispose: vi.fn(),
  resize: vi.fn(),
}));

vi.mock("echarts", () => ({
  init: echartsSpies.init.mockImplementation(() => ({
    setOption: echartsSpies.setOption,
    dispose: echartsSpies.dispose,
    resize: echartsSpies.resize,
  })),
}));

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

function getLatestChartOption(title: string) {
  const calls = echartsSpies.setOption.mock.calls.filter((call) => {
    const option = call[0] as { title?: { text?: string } };
    return option.title?.text === title;
  });

  if (calls.length === 0) {
    return null;
  }

  return calls[calls.length - 1][0] as {
    series?: Array<Record<string, unknown>>;
    xAxis?: { type?: string };
  };
}

function buildDashboardPayload(dashboardId: number) {
  if (dashboardId === 2) {
    return {
      id: dashboardId,
      name: "Draft dashboard",
      description: "Read-only dashboard",
      pipeline: "realtime",
      status: "draft",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [],
    };
  }

  if (dashboardId === 3) {
    return {
      id: dashboardId,
      name: "Historian only dashboard",
      description: "No realtime widgets",
      pipeline: "historian",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 31,
          dashboard_id: dashboardId,
          name: "Historian Only",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Only"],
            range: {
              from: "2026-07-12T00:00:00Z",
              to: "2026-07-12T01:00:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  if (dashboardId === 4) {
    return {
      id: dashboardId,
      name: "Mixed with historian error",
      description: "Historian should fail without blocking realtime",
      pipeline: "realtime",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 41,
          dashboard_id: dashboardId,
          name: "Realtime RPM",
          widget_type: "simple_gauge",
          settings: {
            chart_type: "simple_gauge",
            pipeline: "realtime",
            signals: ["Gen_RPM"],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 42,
          dashboard_id: dashboardId,
          name: "Historian Faulty",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Fail"],
            range: {
              from: "2026-07-12T00:00:00Z",
              to: "2026-07-12T01:00:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  if (dashboardId === 5) {
    return {
      id: dashboardId,
      name: "All chart types",
      description: "Covers all chart rendering semantics",
      pipeline: "realtime",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 51,
          dashboard_id: dashboardId,
          name: "Smoothed line",
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
          id: 52,
          dashboard_id: dashboardId,
          name: "Stacked line",
          widget_type: "stacked_line",
          settings: {
            chart_type: "stacked_line",
            pipeline: "realtime",
            signals: ["Gen_Power", "Gen_RPM"],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 53,
          dashboard_id: dashboardId,
          name: "Simple gauge",
          widget_type: "simple_gauge",
          settings: {
            chart_type: "simple_gauge",
            pipeline: "realtime",
            signals: ["Gen_RPM"],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 54,
          dashboard_id: dashboardId,
          name: "Temperature gauge",
          widget_type: "temperature_gauge",
          settings: {
            chart_type: "temperature_gauge",
            pipeline: "realtime",
            signals: ["Temp_C"],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 55,
          dashboard_id: dashboardId,
          name: "Large scale area",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Area"],
            range: {
              from: "2026-07-12T00:00:00Z",
              to: "2026-07-12T01:00:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  if (dashboardId === 6) {
    return {
      id: dashboardId,
      name: "Historian per-widget scope",
      description: "Each historian widget should query and fail independently",
      pipeline: "historian",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 61,
          dashboard_id: dashboardId,
          name: "Historian Healthy",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Good"],
            range: {
              from: "2026-07-12T00:00:00Z",
              to: "2026-07-12T00:30:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 62,
          dashboard_id: dashboardId,
          name: "Historian Faulty Scoped",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Bad"],
            range: {
              from: "2026-07-12T01:00:00Z",
              to: "2026-07-12T01:20:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  if (dashboardId === 7) {
    return {
      id: dashboardId,
      name: "Historian empty range",
      description: "Historian range should be validated client-side",
      pipeline: "historian",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 71,
          dashboard_id: dashboardId,
          name: "Historian Empty Range",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Only"],
            range: {
              from: "",
              to: "",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  if (dashboardId === 8) {
    return {
      id: dashboardId,
      name: "Historian mixed range validity",
      description: "Missing range must stay widget-scoped and never fallback",
      pipeline: "historian",
      status: "published",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      widgets: [
        {
          id: 81,
          dashboard_id: dashboardId,
          name: "Historian Missing To",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_NoRange"],
            range: {
              from: "2026-07-12T00:00:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 82,
          dashboard_id: dashboardId,
          name: "Historian Healthy Range",
          widget_type: "large_scale_area",
          settings: {
            chart_type: "large_scale_area",
            pipeline: "historian",
            signals: ["Hist_Good"],
            range: {
              from: "2026-07-12T00:00:00Z",
              to: "2026-07-12T00:30:00Z",
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    };
  }

  return {
    id: dashboardId,
    name: "Published dashboard",
    description: "Read-only dashboard",
    pipeline: "realtime",
    status: "published",
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
  };
}

beforeEach(() => {
  MockWebSocket.instances = [];
  echartsSpies.init.mockClear();
  echartsSpies.setOption.mockClear();
  echartsSpies.dispose.mockClear();
  echartsSpies.resize.mockClear();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/dashboards/")) {
        const dashboardIdMatch = url.match(/\/api\/dashboards\/(\d+)/);
        const dashboardId = dashboardIdMatch ? Number(dashboardIdMatch[1]) : 1;
        return new Response(JSON.stringify(buildDashboardPayload(dashboardId)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/historian/series")) {
        if (url.includes("Hist_Fail")) {
          return new Response(JSON.stringify({ detail: "historian unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (url.includes("Hist_Only")) {
          return new Response(
            JSON.stringify({
              series: [{ signal: "Hist_Only", value: 780.2, ts_utc: "2026-07-12T00:20:00Z" }],
              bucket: "1m",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (url.includes("Hist_Area")) {
          return new Response(
            JSON.stringify({
              series: [{ signal: "Hist_Area", value: 502.7, ts_utc: "2026-07-12T00:25:00Z" }],
              bucket: "1m",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (url.includes("Hist_Good")) {
          return new Response(
            JSON.stringify({
              series: [{ signal: "Hist_Good", value: 510.4, ts_utc: "2026-07-12T00:10:00Z" }],
              bucket: "1m",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (url.includes("Hist_Bad")) {
          return new Response(JSON.stringify({ detail: "historian scoped failure" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

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

it("does not open realtime websocket or show realtime status for historian-only dashboards", async () => {
  render(<FixedViewPage dashboardId={3} />);

  expect(await screen.findByRole("heading", { name: /historian only/i })).toBeInTheDocument();
  expect(screen.queryByText(/realtime status:/i)).not.toBeInTheDocument();
  expect(MockWebSocket.instances).toHaveLength(0);
});

it("scopes historian errors to the historian widget without turning the page into an error state", async () => {
  render(<FixedViewPage dashboardId={4} />);

  expect(await screen.findByRole("heading", { name: /realtime rpm/i })).toBeInTheDocument();
  const historianHeading = screen.getByRole("heading", { name: /historian faulty/i });
  const historianWidget = historianHeading.closest("article") as HTMLElement;

  const widgetAlert = await within(historianWidget).findByRole("alert");
  expect(widgetAlert).toHaveTextContent(/request failed with status 500/i);
  expect(screen.getByRole("heading", { name: /fixed dashboard/i })).toBeInTheDocument();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
});

it("renders timestamps in local browser time for historian widgets", async () => {
  render(<FixedViewPage dashboardId={1} />);

  const expectedLocal = new Date("2026-07-12T00:15:00Z").toLocaleString();
  expect(await screen.findByText((content) => content.includes(`Last update: ${expectedLocal}`))).toBeInTheDocument();
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
    const option = getLatestChartOption("Realtime Power");
    expect(option).not.toBeNull();

    const dataPoints = ((option?.series?.[0].data as Array<{ value: [string, number] }>) ?? []).map(
      (entry) => entry.value[1],
    );

    expect(dataPoints).not.toContain(104);
    expect(dataPoints).toContain(106);
    expect(dataPoints).toContain(107);
  });
});

it("queries historian series per widget and scopes failures to the matching widget", async () => {
  const fetchCalls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchCalls.push(url);

      if (url.includes("/api/dashboards/")) {
        return new Response(JSON.stringify(buildDashboardPayload(6)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("signals=Hist_Good")) {
        return new Response(
          JSON.stringify({
            series: [{ signal: "Hist_Good", value: 516.8, ts_utc: "2026-07-12T00:12:00Z" }],
            bucket: "1m",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("signals=Hist_Bad")) {
        return new Response(JSON.stringify({ detail: "historian scoped failure" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ detail: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );

  render(<FixedViewPage dashboardId={6} />);

  const healthyWidget = (await screen.findByRole("heading", { name: /historian healthy/i })).closest(
    "article",
  ) as HTMLElement;
  const faultyWidget = screen.getByRole("heading", { name: /historian faulty scoped/i }).closest(
    "article",
  ) as HTMLElement;

  await within(faultyWidget).findByRole("alert");

  const historianFetches = fetchCalls.filter((url) => url.includes("/api/historian/series"));
  expect(historianFetches).toHaveLength(2);
  expect(historianFetches.some((url) => url.includes("signals=Hist_Good"))).toBe(true);
  expect(historianFetches.some((url) => url.includes("signals=Hist_Bad"))).toBe(true);
  expect(historianFetches.some((url) => url.includes("from=2026-07-12T00%3A00%3A00.000Z"))).toBe(true);
  expect(historianFetches.some((url) => url.includes("from=2026-07-12T01%3A00%3A00.000Z"))).toBe(true);

  expect(within(healthyWidget).queryByRole("alert")).not.toBeInTheDocument();
  expect(within(faultyWidget).getByRole("alert")).toHaveTextContent(/request failed with status 500/i);
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

it("does not query historian series when widget range from/to is empty", async () => {
  const fetchCalls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchCalls.push(url);

      if (url.includes("/api/dashboards/")) {
        return new Response(JSON.stringify(buildDashboardPayload(7)), {
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

  render(<FixedViewPage dashboardId={7} />);

  const widget = (await screen.findByRole("heading", { name: /historian empty range/i })).closest(
    "article",
  ) as HTMLElement;
  const alert = await within(widget).findByRole("alert");

  expect(alert).toHaveTextContent(/edit this widget and set both from and to values/i);
  expect(fetchCalls.some((url) => url.includes("/api/historian/series"))).toBe(false);
});

it("keeps historian range-missing errors widget-scoped and does not fallback to default range", async () => {
  const fetchCalls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchCalls.push(url);

      if (url.includes("/api/dashboards/")) {
        return new Response(JSON.stringify(buildDashboardPayload(8)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/historian/series") && url.includes("Hist_Good")) {
        return new Response(
          JSON.stringify({
            series: [{ signal: "Hist_Good", value: 510.4, ts_utc: "2026-07-12T00:10:00Z" }],
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

  render(<FixedViewPage dashboardId={8} />);

  const missingRangeWidget = (await screen.findByRole("heading", { name: /historian missing to/i })).closest(
    "article",
  ) as HTMLElement;
  const missingRangeAlert = await within(missingRangeWidget).findByRole("alert");
  expect(missingRangeAlert).toHaveTextContent(/edit this widget and set both from and to values/i);

  expect(await screen.findByRole("heading", { name: /historian healthy range/i })).toBeInTheDocument();
  expect(screen.queryByText(/request failed with status/i)).not.toBeInTheDocument();

  const historianFetches = fetchCalls.filter((url) => url.includes("/api/historian/series"));
  expect(historianFetches).toHaveLength(1);
  expect(historianFetches[0]).toContain("signals=Hist_Good");
  expect(historianFetches[0]).not.toContain("Hist_NoRange");
});

it("renders distinct semantics for all five chart types in fixed view", async () => {
  render(<FixedViewPage dashboardId={5} />);

  await waitFor(() => {
    expect(MockWebSocket.instances.length).toBeGreaterThan(0);
  });

  const socket = MockWebSocket.instances[0];
  socket.onopen?.(new Event("open"));

  sendRealtimeEvent(socket, { signal: "Gen_Power", value: 440, ts_utc: "2026-07-12T00:10:00Z" });
  sendRealtimeEvent(socket, { signal: "Gen_RPM", value: 1225, ts_utc: "2026-07-12T00:10:00Z" });
  sendRealtimeEvent(socket, { signal: "Temp_C", value: 72, ts_utc: "2026-07-12T00:10:00Z" });

  await waitFor(() => {
    expect(getLatestChartOption("Smoothed line")?.series?.[0].type).toBe("line");
    expect(getLatestChartOption("Smoothed line")?.series?.[0].smooth).toBe(true);
    expect(getLatestChartOption("Stacked line")?.series?.every((series) => series.stack === "total")).toBe(
      true,
    );
    expect(getLatestChartOption("Large scale area")?.series?.[0].areaStyle).toBeTruthy();
    expect(getLatestChartOption("Simple gauge")?.series?.[0].type).toBe("gauge");
    expect(getLatestChartOption("Temperature gauge")?.series?.[0].type).toBe("gauge");
  });
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
