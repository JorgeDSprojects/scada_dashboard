import React from "react";
import { useParams } from "react-router-dom";

import { createWidget, updateDashboard } from "../api/client";
import { WidgetForm, type WidgetLaunchPayload } from "../components/editor/WidgetForm";
import { WidgetGrid, type WidgetGridItem } from "../components/editor/WidgetGrid";
import type { DashboardPipeline, DashboardStatus } from "../types/dashboard";

type EditorPageProps = {
  dashboardId?: number;
};

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
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const resolvedDashboardId = normalizeDashboardId(dashboardId);

  const handleLaunchWidget = async (payload: WidgetLaunchPayload) => {
    if (resolvedDashboardId === null) {
      setError("Missing dashboard id.");
      return;
    }

    try {
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
        },
      });

      setWidgets((previous) => [
        ...previous,
        {
          id: created.id,
          name: created.name,
          chartType: payload.chartType,
          pipeline,
          signals: payload.signals.map((entry) => `${entry.signal} (${entry.color})`),
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

  return (
    <section>
      <h1>Dashboard editor</h1>

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
        onDeleteWidget={(id) => {
          setWidgets((previous) => previous.filter((widget) => widget.id !== id));
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
