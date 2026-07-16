import React from "react";

import type { RealtimeConnectionStatus } from "../../hooks/useRealtimeStream";

type GaugeWidgetProps = {
  title: string;
  value: number | null;
  connectionStatus?: RealtimeConnectionStatus;
};

export function GaugeWidget({ title, value, connectionStatus }: GaugeWidgetProps) {
  return (
    <article>
      <h3>{title}</h3>
      {connectionStatus ? <p>{`Connection: ${connectionStatus}`}</p> : null}
      <p>{value === null ? "No value yet." : value.toFixed(2)}</p>
    </article>
  );
}
