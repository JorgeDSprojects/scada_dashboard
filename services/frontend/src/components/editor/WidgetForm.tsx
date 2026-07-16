import React from "react";

import type { DashboardPipeline } from "../../types/dashboard";
import { RangePicker } from "./RangePicker";
import { SignalSelector } from "./SignalSelector";

export type SignalEntry = {
  signal: string;
  color: string;
};

export type WidgetLaunchPayload = {
  chartType: string;
  signals: SignalEntry[];
  range:
    | {
        from: string;
        to: string;
      }
    | null;
};

type WidgetFormProps = {
  name: string;
  description: string;
  pipeline: DashboardPipeline;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPipelineChange: (value: DashboardPipeline) => void;
  onLaunchWidget: (payload: WidgetLaunchPayload) => void;
};

const CHART_TYPE_OPTIONS: Record<DashboardPipeline, string[]> = {
  realtime: ["line", "stacked_line", "gauge", "temperature_gauge"],
  historian: ["area"],
};

function defaultChartType(pipeline: DashboardPipeline): string {
  return CHART_TYPE_OPTIONS[pipeline][0];
}

export function WidgetForm({
  name,
  description,
  pipeline,
  onNameChange,
  onDescriptionChange,
  onPipelineChange,
  onLaunchWidget,
}: WidgetFormProps) {
  const [chartType, setChartType] = React.useState(defaultChartType(pipeline));
  const [signals, setSignals] = React.useState<SignalEntry[]>([]);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    if (!CHART_TYPE_OPTIONS[pipeline].includes(chartType)) {
      setChartType(defaultChartType(pipeline));
    }
  }, [chartType, pipeline]);

  const handleAddSignal = (signal: string, color: string) => {
    setSignals((previous) => [...previous, { signal, color }]);
  };

  return (
    <section>
      <h2>Editor controls</h2>

      <label htmlFor="dashboard-name">Name</label>
      <input
        id="dashboard-name"
        aria-label="name"
        value={name}
        onChange={(event) => {
          onNameChange(event.target.value);
        }}
      />

      <label htmlFor="dashboard-description">Description</label>
      <textarea
        id="dashboard-description"
        aria-label="description"
        maxLength={500}
        value={description}
        onChange={(event) => {
          onDescriptionChange(event.target.value);
        }}
      />

      <label htmlFor="pipeline-select">Pipeline</label>
      <select
        id="pipeline-select"
        aria-label="pipeline"
        value={pipeline}
        onChange={(event) => {
          onPipelineChange(event.target.value as DashboardPipeline);
        }}
      >
        <option value="realtime">realtime</option>
        <option value="historian">historian</option>
      </select>

      <label htmlFor="chart-type-select">Chart type</label>
      <select
        id="chart-type-select"
        aria-label="chart_type"
        value={chartType}
        onChange={(event) => {
          setChartType(event.target.value);
        }}
      >
        {CHART_TYPE_OPTIONS[pipeline].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <SignalSelector onAdd={handleAddSignal} />

      <ul aria-label="added-series">
        {signals.map((entry, index) => (
          <li key={`${entry.signal}-${entry.color}-${index}`}>{`${entry.signal} - ${entry.color}`}</li>
        ))}
      </ul>

      <RangePicker pipeline={pipeline} from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      <button
        type="button"
        onClick={() => {
          onLaunchWidget({
            chartType,
            signals,
            range: pipeline === "historian" ? { from, to } : null,
          });
        }}
      >
        Launch widget
      </button>
    </section>
  );
}
