export type DashboardPipeline = "realtime" | "historian";

export type DashboardStatus = "draft" | "published";

export type Dashboard = {
  id: number;
  name: string;
  description: string;
  pipeline: DashboardPipeline;
  status: DashboardStatus;
};

export type Widget = {
  id: number;
  dashboard_id: number;
  name: string;
  widget_type: string;
  settings: Record<string, unknown>;
};
