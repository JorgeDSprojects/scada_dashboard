export type DashboardPipeline = "realtime" | "historian";

export type DashboardStatus = "draft" | "published";

export type Dashboard = {
  id: number;
  name: string;
  description: string;
  pipeline: DashboardPipeline;
  status: DashboardStatus;
};
