import React from "react";
import { useParams } from "react-router-dom";

import {
  createWidget,
  deleteWidget,
  getDashboard,
  updateDashboard,
  updateWidget,
} from "../api/client";
import { WidgetForm, type WidgetLaunchPayload } from "../components/editor/WidgetForm";
import { WidgetGrid, type WidgetGridItem } from "../components/editor/WidgetGrid";
import type { DashboardPipeline, DashboardStatus, Widget, WidgetLayout } from "../types/dashboard";

type EditorPageProps = {
  dashboardId?: number;
};

function buildDefaultLayout(index: number): WidgetLayout {
  return {
    x: (index * 4) % 12,
    y: Math.floor(index / 3) * 6,
    w: 4,
    h: 6,
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseLayout(value: unknown, fallback: WidgetLayout): WidgetLayout {
  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  const { x, y, w, h } = candidate;
  if (typeof x !== "number" || typeof y !== "number" || typeof w !== "number" || typeof h !== "number") {
    return fallback;
  }

  return { x, y, w, h };
}

function mapWidgetToGridItem(widget: Widget, fallbackPipeline: DashboardPipeline, index: number): WidgetGridItem {
  const settings = (widget.settings ?? {}) as Record<string, unknown>;
  const signals = parseStringArray(settings.signals);
  const colors = parseStringArray(settings.colors);
  const chartType = typeof settings.chart_type === "string" ? settings.chart_type : widget.widget_type;
  const pipeline = settings.pipeline === "historian" || settings.pipeline === "realtime"
    ? settings.pipeline
    : fallbackPipeline;

  const signalLabels = signals.map((signal, signalIndex) => {
    const color = colors[signalIndex] ?? "unassigned";
    return `${signal} (${color})`;
  });

  return {
    id: widget.id,
    name: widget.name,
    chartType,
    pipeline,
    signals: signalLabels,
    layout: parseLayout(settings.layout, buildDefaultLayout(index)),
    settings,
  };
}

function normalizeDashboardId(value: number | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return value;
}

export function EditorPage({ dashboardId }: EditorPageProps) {
  const [name, setName] = React.useState("New dashboard");
  const [description, setDescription] = React.useState("");
  const [pipeline, setPipeline] = React.useState<DashboardPipeline>("realtime");
  const [widgets, setWidgets] = React.useState<WidgetGridItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const resolvedDashboardId = normalizeDashboardId(dashboardId);

  React.useEffect(() => {
    if (resolvedDashboardId === null) {
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoadingDashboard(true);

      try {
        const dashboard = await getDashboard(resolvedDashboardId);
        if (!active) {
          return;
        }

        setName(dashboard.name);
        setDescription(dashboard.description);
        setPipeline(dashboard.pipeline);

        const sourceWidgets = Array.isArray(dashboard.widgets) ? dashboard.widgets : [];
        setWidgets(sourceWidgets.map((widget, index) => mapWidgetToGridItem(widget, dashboard.pipeline, index)));

        setError(null);
      } catch {
        if (active) {
          setError("Unable to load dashboard.");
          setWidgets([]);
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

  const handleLaunchWidget = async (payload: WidgetLaunchPayload) => {
    if (resolvedDashboardId === null) {
      setError("Missing dashboard id.");
      return;
    }

    try {
      const newLayout = buildDefaultLayout(widgets.length);
      const created = await createWidget(resolvedDashboardId, {
        name,
        widget_type: payload.chartType,
        settings: {
          chart_type: payload.chartType,
          description,
          pipeline,
          signals: payload.signals.map((entry) => entry.signal),
          colors: payload.signals.map((entry) => entry.color),
          range: payload.range,
          layout: newLayout,
        },
      });

      const createdSettings = (created.settings ?? {}) as Record<string, unknown>;

      setWidgets((previous) => [
        ...previous,
        {
          id: created.id,
          name: created.name,
          chartType: payload.chartType,
          pipeline,
          signals: payload.signals.map((entry) => `${entry.signal} (${entry.color})`),
          layout: parseLayout(createdSettings.layout, newLayout),
          settings: createdSettings,
        },
      ]);
      setError(null);
      setStatusMessage("Widget launched.");
    } catch {
      setError("Unable to launch widget.");
    }
  };

  const handleDashboardStatus = async (status: DashboardStatus) => {
    if (resolvedDashboardId === null) {
      setError("Missing dashboard id.");
      return;
    }

    try {
      await updateDashboard(resolvedDashboardId, {
        name,
        description,
        pipeline,
        status,
      });

      setError(null);
      setStatusMessage(status === "draft" ? "Draft saved." : "Dashboard published.");
    } catch {
      setError("Unable to update dashboard.");
    }
  };

  const handleDeleteWidget = async (widgetId: number) => {
    try {
      await deleteWidget(widgetId);
      setWidgets((previous) => previous.filter((widget) => widget.id !== widgetId));
      setError(null);
      setStatusMessage("Widget deleted.");
    } catch {
      setError("Unable to delete widget.");
    }
  };

  const handleLayoutChange = (widgetId: number, layout: WidgetLayout) => {
    let settingsToPersist: Record<string, unknown> | null = null;

    setWidgets((previous) =>
      previous.map((widget) => {
        if (widget.id !== widgetId) {
          return widget;
        }

        settingsToPersist = {
          ...widget.settings,
          layout,
        };

        return {
          ...widget,
          layout,
          settings: settingsToPersist,
        };
      }),
    );

    if (!settingsToPersist) {
      return;
    }

    void (async () => {
      try {
        await updateWidget(widgetId, {
          settings: settingsToPersist ?? undefined,
        });
        setError(null);
        setStatusMessage("Layout saved.");
      } catch {
        setError("Unable to persist widget layout.");
      }
    })();
  };

  return (
    <section>
      <h1>Dashboard editor</h1>
      {loadingDashboard ? <p>Loading dashboard...</p> : null}

      <WidgetForm
        name={name}
        description={description}
        pipeline={pipeline}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onPipelineChange={setPipeline}
        onLaunchWidget={(payload) => {
          void handleLaunchWidget(payload);
        }}
      />

      <div>
        <button
          type="button"
          onClick={() => {
            void handleDashboardStatus("draft");
          }}
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => {
            void handleDashboardStatus("published");
          }}
        >
          Publish dashboard
        </button>
      </div>

      {error ? <p role="alert">{error}</p> : null}
      {statusMessage ? <p role="status">{statusMessage}</p> : null}

      <WidgetGrid
        widgets={widgets}
        onDeleteWidget={(widgetId) => {
          void handleDeleteWidget(widgetId);
        }}
        onLayoutChange={(widgetId, layout) => {
          handleLayoutChange(widgetId, layout);
        }}
      />
    </section>
  );
}

export function EditorRoutePage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params.id ? Number(params.id) : undefined;
  return <EditorPage dashboardId={dashboardId} />;
}
