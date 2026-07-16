import React from "react";
import type { EChartsOption } from "echarts";

import { EChartCanvas } from "./EChartCanvas";
import type { RealtimeConnectionStatus } from "../../hooks/useRealtimeStream";

type ChartPoint = {
  signal: string;
  value: number;
  ts_utc: string;
};

type ChartWidgetProps = {
  title: string;
  chartType: string;
  points: ChartPoint[];
  connectionStatus?: RealtimeConnectionStatus;
  error?: string | null;
  loading?: boolean;
  lastTimestamp?: string | null;
};

function formatLocalTimestamp(tsUtc: string): string {
  const parsed = new Date(tsUtc);
  if (Number.isNaN(parsed.getTime())) {
    return tsUtc;
  }

  return parsed.toLocaleString();
}

function buildLineOption(title: string, chartType: string, points: ChartPoint[]): EChartsOption {
  const sortedPoints = [...points].sort(
    (left, right) => new Date(left.ts_utc).getTime() - new Date(right.ts_utc).getTime(),
  );

  const pointsBySignal = sortedPoints.reduce((accumulator, point) => {
    const signalPoints = accumulator.get(point.signal) ?? [];
    signalPoints.push({ value: [point.ts_utc, point.value] });
    accumulator.set(point.signal, signalPoints);
    return accumulator;
  }, new Map<string, Array<{ value: [string, number] }>>());

  const series = Array.from(pointsBySignal.entries()).map(([signal, signalPoints]) => {
    const lineSeries: Record<string, unknown> = {
      name: signal,
      type: "line",
      data: signalPoints,
      showSymbol: false,
      emphasis: { focus: "series" },
    };

    if (chartType === "smoothed_line") {
      lineSeries.smooth = true;
    }

    if (chartType === "stacked_line") {
      lineSeries.stack = "total";
    }

    if (chartType === "large_scale_area") {
      lineSeries.areaStyle = { opacity: 0.25 };
      lineSeries.smooth = true;
    }

    return lineSeries;
  });

  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number | string) =>
        typeof value === "number" ? value.toFixed(2) : String(value),
    },
    legend: { top: 24 },
    grid: { left: 50, right: 20, top: 60, bottom: 35 },
    xAxis: {
      type: "time",
    },
    yAxis: {
      type: "value",
    },
    series,
  };
}

export function ChartWidget({
  title,
  chartType,
  points,
  connectionStatus,
  error,
  loading = false,
  lastTimestamp = null,
}: ChartWidgetProps) {
  const chartOption = React.useMemo(() => buildLineOption(title, chartType, points), [title, chartType, points]);
  const localTimestamp = lastTimestamp ? formatLocalTimestamp(lastTimestamp) : null;

  return (
    <article>
      <h3>{title}</h3>
      {connectionStatus ? <p>{`Connection: ${connectionStatus}`}</p> : null}
      <EChartCanvas option={chartOption} />
      {loading ? <p>Loading historian data...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!error && !loading && points.length === 0 ? <p>No points available.</p> : null}
      {!error && localTimestamp ? <p>{`Last update: ${localTimestamp}`}</p> : null}
    </article>
  );
}
