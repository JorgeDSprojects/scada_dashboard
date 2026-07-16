import React from "react";
import { useParams } from "react-router-dom";

import { buildApiUrl } from "../api/client";
import { ChartWidget } from "../components/widgets/ChartWidget";
import { GaugeWidget } from "../components/widgets/GaugeWidget";
import { useHistorianSeries } from "../hooks/useHistorianSeries";
import type { RealtimeConnectionStatus, RealtimeEvent } from "../hooks/useRealtimeStream";
import { useRealtimeStream } from "../hooks/useRealtimeStream";
import { normalizeChartType } from "../types/chart-types";
import type { Dashboard, DashboardPipeline, Widget } from "../types/dashboard";

type FixedViewPageProps = {
  dashboardId?: number;
};

type WidgetRange = {
  from: string;
  to: string;
};

type WidgetSettings = {
  chartType: string;
  pipeline: DashboardPipeline;
  signals: string[];
  range: WidgetRange | null;
};

type DashboardWithWidgets = Dashboard & {
  widgets?: Widget[];
};

type ParsedWidget = {
  widget: Widget;
  settings: WidgetSettings;
};

const DEFAULT_FROM = "2026-07-12T00:00:00Z";
const DEFAULT_TO = "2026-07-12T01:00:00Z";
const DEFAULT_BUCKET = "1m";

type FixedWidgetRendererProps = {
  parsedWidget: ParsedWidget;
  realtimeEvents: RealtimeEvent[];
  realtimeStatus: RealtimeConnectionStatus;
};

function FixedWidgetRenderer({ parsedWidget, realtimeEvents, realtimeStatus }: FixedWidgetRendererProps) {
  const { widget, settings } = parsedWidget;
  const relatedRealtime = React.useMemo(
    () => realtimeEvents.filter((event) => settings.signals.includes(event.signal)),
    [realtimeEvents, settings.signals],
  );

  const historianRange = settings.range ?? { from: DEFAULT_FROM, to: DEFAULT_TO };
  const historianEnabled = settings.pipeline === "historian" && settings.signals.length > 0;

  const {
    series: historianSeries,
    loading: loadingHistorian,
    error: historianError,
  } = useHistorianSeries({
    enabled: historianEnabled,
    signals: settings.signals,
    from: historianRange.from,
    to: historianRange.to,
    bucket: DEFAULT_BUCKET,
  });

  const values = settings.pipeline === "historian" ? historianSeries : relatedRealtime;
  const latestValue = values.length > 0 ? values[values.length - 1].value : null;
  const latestTimestamp = values.length > 0 ? values[values.length - 1].ts_utc : null;
  const connectionStatus = settings.pipeline === "realtime" ? realtimeStatus : undefined;
  const widgetError = settings.pipeline === "historian" ? historianError : null;
  const loading = settings.pipeline === "historian" ? loadingHistorian : false;

  if (settings.chartType === "simple_gauge" || settings.chartType === "temperature_gauge") {
    return (
      <GaugeWidget
        title={widget.name}
        chartType={settings.chartType}
        value={latestValue}
        connectionStatus={connectionStatus}
        error={widgetError}
        loading={loading}
      />
    );
  }

  return (
    <ChartWidget
      title={widget.name}
      chartType={settings.chartType}
      points={values}
      connectionStatus={connectionStatus}
      error={widgetError}
      loading={loading}
      lastTimestamp={latestTimestamp}
    />
  );
}

function normalizeDashboardId(value: number | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseWidgetSettings(widget: Widget, fallbackPipeline: DashboardPipeline): WidgetSettings {
  const raw = widget.settings as Record<string, unknown>;
  const pipeline = raw.pipeline === "historian" || raw.pipeline === "realtime" ? raw.pipeline : fallbackPipeline;
  const signals = Array.isArray(raw.signals)
    ? raw.signals.filter((entry): entry is string => typeof entry === "string")
    : [];
  const rangeValue = raw.range;

  let range: WidgetRange | null = null;
  if (typeof rangeValue === "object" && rangeValue !== null) {
    const candidate = rangeValue as Record<string, unknown>;
    if (typeof candidate.from === "string" && typeof candidate.to === "string") {
      range = { from: candidate.from, to: candidate.to };
    }
  }

  return {
    chartType: normalizeChartType(typeof raw.chart_type === "string" ? raw.chart_type : widget.widget_type),
    pipeline,
    signals,
    range,
  };
}

export function FixedViewPage({ dashboardId }: FixedViewPageProps) {
  const [dashboard, setDashboard] = React.useState<DashboardWithWidgets | null>(null);
  const [loadingDashboard, setLoadingDashboard] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const resolvedDashboardId = normalizeDashboardId(dashboardId);
  const isPublished = dashboard?.status === "published";

  React.useEffect(() => {
    if (resolvedDashboardId === null) {
      setDashboard(null);
      setLoadingDashboard(false);
      setError("Missing dashboard id.");
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoadingDashboard(true);

      try {
        const response = await fetch(buildApiUrl(`/api/dashboards/${resolvedDashboardId}`));
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as DashboardWithWidgets;
        if (active) {
          setDashboard({ ...payload, widgets: Array.isArray(payload.widgets) ? payload.widgets : [] });
          setError(null);
        }
      } catch {
        if (active) {
          setError("Unable to load dashboard.");
          setDashboard(null);
        }
      } finally {
        if (active) {
          setLoadingDashboard(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [resolvedDashboardId]);

  const parsedWidgets = React.useMemo(() => {
    if (!dashboard) {
      return [] as ParsedWidget[];
    }

    const fallbackPipeline = dashboard.pipeline;
    const sourceWidgets = Array.isArray(dashboard.widgets) ? dashboard.widgets : [];

    return sourceWidgets.map((widget) => ({
      widget,
      settings: parseWidgetSettings(widget, fallbackPipeline),
    }));
  }, [dashboard]);

  const hasRealtimeWidgets =
    isPublished && parsedWidgets.some(({ settings }) => settings.pipeline === "realtime");

  const realtimeDashboardId = resolvedDashboardId !== null && hasRealtimeWidgets ? resolvedDashboardId : null;
  const { status: realtimeStatus, events: realtimeEvents } = useRealtimeStream(realtimeDashboardId);

  if (loadingDashboard) {
    return (
      <section>
        <h1>Fixed dashboard</h1>
        <p>Loading dashboard...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h1>Fixed dashboard</h1>
        <p role="alert">{error}</p>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section>
        <h1>Fixed dashboard</h1>
        <p role="alert">Dashboard not found.</p>
      </section>
    );
  }

  if (!isPublished) {
    return (
      <section>
        <h1>Fixed dashboard</h1>
        <p role="alert">Dashboard is not published yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Fixed dashboard</h1>

      <p>{dashboard.name}</p>
      {hasRealtimeWidgets ? <p>{`Realtime status: ${realtimeStatus}`}</p> : null}

      <div>
        {parsedWidgets.length === 0 && !loadingDashboard ? <p>No widgets available.</p> : null}
        {parsedWidgets.map(({ widget, settings }) => {
          return (
            <FixedWidgetRenderer
              key={widget.id}
              parsedWidget={{ widget, settings }}
              realtimeEvents={realtimeEvents}
              realtimeStatus={realtimeStatus}
            />
          );
        })}
      </div>
    </section>
  );
}

export function FixedViewRoutePage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params.id ? Number(params.id) : undefined;
  return <FixedViewPage dashboardId={dashboardId} />;
}
