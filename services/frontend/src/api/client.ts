import type { Dashboard, DashboardStatus, Widget } from "../types/dashboard";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL ?? "").replace(/\/+$/, "");

function resolveBrowserOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost";
}

function normalizeHttpBase(baseUrl: string): string {
  if (baseUrl.startsWith("ws://")) {
    return `http://${baseUrl.slice(5)}`;
  }
  if (baseUrl.startsWith("wss://")) {
    return `https://${baseUrl.slice(6)}`;
  }
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return baseUrl;
  }

  return new URL(baseUrl, resolveBrowserOrigin()).toString();
}

export function buildApiUrl(path: string): string {
  return API_BASE_URL.length > 0 ? `${API_BASE_URL}${path}` : path;
}

export function buildWebSocketUrl(path: string): string {
  if (path.startsWith("ws://") || path.startsWith("wss://")) {
    return path;
  }

  const baseCandidate = WS_BASE_URL || API_BASE_URL || resolveBrowserOrigin();
  const normalizedBase = normalizeHttpBase(baseCandidate);
  const asHttpUrl = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : new URL(path, normalizedBase).toString();
  const url = new URL(asHttpUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listDashboards(): Promise<Dashboard[]> {
  const response = await fetch(buildApiUrl("/api/dashboards"));
  return parseResponse<Dashboard[]>(response);
}

export async function createDashboard(payload: {
  name: string;
  description: string;
  pipeline: Dashboard["pipeline"];
  status: DashboardStatus;
}): Promise<Dashboard> {
  const response = await fetch(buildApiUrl("/api/dashboards"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Dashboard>(response);
}

export async function getDashboard(dashboardId: number): Promise<Dashboard & { widgets?: Widget[] }> {
  const response = await fetch(buildApiUrl(`/api/dashboards/${dashboardId}`));
  return parseResponse<Dashboard & { widgets?: Widget[] }>(response);
}

export async function deleteDashboard(dashboardId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/dashboards/${dashboardId}`), {
    method: "DELETE",
  });
  await parseResponse<void>(response);
}

export async function updateDashboard(
  dashboardId: number,
  payload: {
    name?: string;
    description?: string;
    pipeline?: Dashboard["pipeline"];
    status?: DashboardStatus;
  },
): Promise<Dashboard> {
  const response = await fetch(buildApiUrl(`/api/dashboards/${dashboardId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Dashboard>(response);
}

export async function createWidget(
  dashboardId: number,
  payload: {
    name: string;
    widget_type: string;
    settings: Record<string, unknown>;
  },
): Promise<Widget> {
  const response = await fetch(buildApiUrl(`/api/dashboards/${dashboardId}/widgets`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Widget>(response);
}

export async function updateWidget(
  widgetId: number,
  payload: {
    name?: string;
    widget_type?: string;
    settings?: Record<string, unknown>;
  },
): Promise<Widget> {
  const response = await fetch(buildApiUrl(`/api/widgets/${widgetId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<Widget>(response);
}

export async function deleteWidget(widgetId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/widgets/${widgetId}`), {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}
