import type { Dashboard, DashboardStatus, Widget } from "../types/dashboard";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  return API_BASE_URL.length > 0 ? `${API_BASE_URL}${path}` : path;
}

export function buildWebSocketUrl(path: string): string {
  const candidateUrl = buildApiUrl(path);
  if (candidateUrl.startsWith("http://") || candidateUrl.startsWith("https://")) {
    const url = new URL(candidateUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }

  return candidateUrl;
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
