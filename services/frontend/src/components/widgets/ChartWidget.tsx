import React from "react";

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
};

function formatLocalTimestamp(tsUtc: string): string {
  const parsed = new Date(tsUtc);
  if (Number.isNaN(parsed.getTime())) {
    return tsUtc;
  }

  return parsed.toLocaleString();
}

export function ChartWidget({ title, chartType, points, connectionStatus, error }: ChartWidgetProps) {
  const modeLabel =
    chartType === "smoothed_line"
      ? "Smoothed line"
      : chartType === "stacked_line"
        ? "Stacked line"
        : chartType === "large_scale_area"
          ? "Large scale area"
          : "Series";

  const sortedPoints = [...points].sort((left, right) => {
    return new Date(left.ts_utc).getTime() - new Date(right.ts_utc).getTime();
  });

  const smoothedPoints = sortedPoints.map((point, index) => {
    const windowStart = Math.max(0, index - 2);
    const samples = sortedPoints.slice(windowStart, index + 1);
    const average = samples.reduce((accumulator, sample) => accumulator + sample.value, 0) / samples.length;
    return { point, average };
  });

  const stackedPoints = Array.from(
    sortedPoints.reduce((accumulator, point) => {
      const key = point.ts_utc;
      const current = accumulator.get(key) ?? { total: 0, signals: 0, ts_utc: point.ts_utc };
      current.total += point.value;
      current.signals += 1;
      accumulator.set(key, current);
      return accumulator;
    }, new Map<string, { total: number; signals: number; ts_utc: string }>()),
  ).map(([, value]) => value);

  const areaSummary =
    sortedPoints.length > 0
      ? {
          min: Math.min(...sortedPoints.map((point) => point.value)),
          max: Math.max(...sortedPoints.map((point) => point.value)),
          avg: sortedPoints.reduce((accumulator, point) => accumulator + point.value, 0) / sortedPoints.length,
        }
      : null;

  return (
    <article>
      <h3>{title}</h3>
      <p>{`Mode: ${modeLabel}`}</p>
      {connectionStatus ? <p>{`Connection: ${connectionStatus}`}</p> : null}
      {error ? (
        <p role="alert">{error}</p>
      ) : points.length === 0 ? (
        <p>No points available.</p>
      ) : chartType === "stacked_line" ? (
        <ul aria-label={`${title} stacked points`}>
          {stackedPoints.map((point, index) => (
            <li key={`${point.ts_utc}-${index}`}>{`Stack total: ${point.total.toFixed(2)} from ${point.signals} signals (${formatLocalTimestamp(point.ts_utc)})`}</li>
          ))}
        </ul>
      ) : chartType === "large_scale_area" ? (
        <>
          {areaSummary ? (
            <p>{`Area summary - min: ${areaSummary.min.toFixed(2)}, max: ${areaSummary.max.toFixed(2)}, avg: ${areaSummary.avg.toFixed(2)}`}</p>
          ) : null}
          <ul aria-label={`${title} area points`}>
            {sortedPoints.map((point, index) => (
              <li key={`${point.signal}-${point.ts_utc}-${index}`}>
                {`${point.signal}: ${point.value} (${formatLocalTimestamp(point.ts_utc)})`}
              </li>
            ))}
          </ul>
        </>
      ) : chartType === "smoothed_line" ? (
        <ul aria-label={`${title} smoothed points`}>
          {smoothedPoints.map(({ point, average }, index) => (
            <li key={`${point.signal}-${point.ts_utc}-${index}`}>
              {`${point.signal}: ${point.value} (smoothed ${average.toFixed(2)}) (${formatLocalTimestamp(point.ts_utc)})`}
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label={`${title} points`}>
          {sortedPoints.map((point, index) => (
            <li key={`${point.signal}-${point.ts_utc}-${index}`}>
              {`${point.signal}: ${point.value} (${formatLocalTimestamp(point.ts_utc)})`}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
