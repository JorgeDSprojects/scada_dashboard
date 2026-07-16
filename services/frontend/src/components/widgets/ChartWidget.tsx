import React from "react";

import type { RealtimeConnectionStatus } from "../../hooks/useRealtimeStream";

type ChartPoint = {
  signal: string;
  value: number;
  ts_utc: string;
};

type ChartWidgetProps = {
  title: string;
  points: ChartPoint[];
  connectionStatus?: RealtimeConnectionStatus;
};

function formatLocalTimestamp(tsUtc: string): string {
  const parsed = new Date(tsUtc);
  if (Number.isNaN(parsed.getTime())) {
    return tsUtc;
  }

  return parsed.toLocaleString();
}

export function ChartWidget({ title, points, connectionStatus }: ChartWidgetProps) {
  return (
    <article>
      <h3>{title}</h3>
      {connectionStatus ? <p>{`Connection: ${connectionStatus}`}</p> : null}
      {points.length === 0 ? (
        <p>No points available.</p>
      ) : (
        <ul aria-label={`${title} points`}>
          {points.slice(-5).map((point, index) => (
            <li key={`${point.signal}-${point.ts_utc}-${index}`}>
              {`${point.signal}: ${point.value} (${formatLocalTimestamp(point.ts_utc)})`}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
