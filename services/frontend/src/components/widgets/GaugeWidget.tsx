import React from "react";
import type { EChartsOption } from "echarts";

import { EChartCanvas } from "./EChartCanvas";
import type { RealtimeConnectionStatus } from "../../hooks/useRealtimeStream";

type GaugeWidgetProps = {
  title: string;
  chartType: string;
  value: number | null;
  connectionStatus?: RealtimeConnectionStatus;
  error?: string | null;
  loading?: boolean;
};

function buildGaugeOption(title: string, chartType: string, value: number | null): EChartsOption {
  const isTemperatureGauge = chartType === "temperature_gauge";
  const min = isTemperatureGauge ? 0 : 0;
  const max = isTemperatureGauge ? 120 : 2000;

  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    series: [
      {
        type: "gauge",
        min,
        max,
        progress: { show: true, width: 14 },
        axisLine: { lineStyle: { width: 14 } },
        detail: {
          formatter: isTemperatureGauge ? "{value} C" : "{value}",
          fontSize: 14,
          offsetCenter: [0, "70%"],
        },
        pointer: { width: 4 },
        data: [{ value: value ?? min }],
      },
    ],
  };
}

export function GaugeWidget({ title, chartType, value, connectionStatus, error, loading = false }: GaugeWidgetProps) {
  const chartOption = React.useMemo(() => buildGaugeOption(title, chartType, value), [title, chartType, value]);

  const temperatureBand =
    value === null ? null : value >= 80 ? "high" : value <= 40 ? "low" : "normal";

  const valueText =
    value === null
      ? "No value yet."
      : chartType === "temperature_gauge"
        ? `${value.toFixed(2)} C (${temperatureBand})`
        : value.toFixed(2);

  return (
    <article>
      <h3>{title}</h3>
      {connectionStatus ? <p>{`Connection: ${connectionStatus}`}</p> : null}
      <EChartCanvas option={chartOption} />
      {loading ? <p>Loading historian data...</p> : null}
      {error ? <p role="alert">{error}</p> : <p>{valueText}</p>}
    </article>
  );
}
