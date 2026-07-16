import React from "react";

import type { DashboardPipeline } from "../../types/dashboard";

export type WidgetGridItem = {
  id: number;
  name: string;
  chartType: string;
  pipeline: DashboardPipeline;
  signals: string[];
};

type WidgetGridProps = {
  widgets: WidgetGridItem[];
  onDeleteWidget: (id: number) => void;
};

export function WidgetGrid({ widgets, onDeleteWidget }: WidgetGridProps) {
  return (
    <section>
      <h2>Widget grid</h2>
      {widgets.length === 0 ? <p>No widgets launched yet.</p> : null}
      <ul>
        {widgets.map((widget) => (
          <li key={widget.id}>
            <strong>{widget.name}</strong> - {widget.chartType} - {widget.pipeline} - {widget.signals.join(", ")}
            <button
              type="button"
              onClick={() => {
                onDeleteWidget(widget.id);
              }}
            >
              Delete widget
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
