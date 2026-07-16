import type { Dashboard } from "../types/dashboard";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function buildApiUrl(path: string): string {
  return API_BASE_URL.length > 0 ? `${API_BASE_URL}${path}` : path;
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
