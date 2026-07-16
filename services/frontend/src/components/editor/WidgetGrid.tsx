import React from "react";
import GridLayout, { type Layout } from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import type { DashboardPipeline, WidgetLayout } from "../../types/dashboard";

export type WidgetGridItem = {
  id: number;
  name: string;
  chartType: string;
  pipeline: DashboardPipeline;
  signals: string[];
  layout: WidgetLayout;
  settings: Record<string, unknown>;
};

type WidgetGridProps = {
  widgets: WidgetGridItem[];
  onDeleteWidget: (id: number) => void;
  onLayoutChange: (id: number, layout: WidgetLayout) => void;
};

function mapLayout(widgets: WidgetGridItem[]): Layout[] {
  return widgets.map((widget) => ({
    i: String(widget.id),
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
  }));
}

export function WidgetGrid({ widgets, onDeleteWidget, onLayoutChange }: WidgetGridProps) {
  const layout = React.useMemo(() => mapLayout(widgets), [widgets]);

  const handleLayoutCommit = (item: Layout) => {
    const id = Number(item.i);
    if (!Number.isFinite(id)) {
      return;
    }

    onLayoutChange(id, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    });
  };

  return (
    <section>
      <h2>Widget grid</h2>
      {widgets.length === 0 ? <p>No widgets launched yet.</p> : null}
      {widgets.length > 0 ? (
        <GridLayout
          className="widget-grid-layout"
          layout={layout}
          cols={12}
          rowHeight={36}
          width={1200}
          compactType="vertical"
          preventCollision={false}
          onDragStop={(_, __, item) => {
            handleLayoutCommit(item);
          }}
          onResizeStop={(_, __, item) => {
            handleLayoutCommit(item);
          }}
        >
          {widgets.map((widget) => (
            <div key={String(widget.id)}>
              <article>
                <strong>{widget.name}</strong>
                <p>{`${widget.chartType} - ${widget.pipeline} - ${widget.signals.join(", ")}`}</p>
                <button
                  type="button"
                  aria-label={`Delete widget ${widget.name}`}
                  onClick={() => {
                    onDeleteWidget(widget.id);
                  }}
                >
                  Delete widget
                </button>
              </article>
            </div>
          ))}
        </GridLayout>
      ) : null}
    </section>
  );
}
