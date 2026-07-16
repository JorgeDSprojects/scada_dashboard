export type DashboardPipeline = "realtime" | "historian";

export type DashboardStatus = "draft" | "published";

export type Dashboard = {
  id: number;
  name: string;
  description: string;
  pipeline: DashboardPipeline;
  status: DashboardStatus;
  created_at: string;
  updated_at: string;
};

export type WidgetLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Widget = {
  id: number;
  dashboard_id: number;
  name: string;
  widget_type: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
