import React from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

type EChartCanvasProps = {
  option: EChartsOption;
  height?: number;
};

export function EChartCanvas({ option, height = 220 }: EChartCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    chartRef.current.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} style={{ width: "100%", height }} aria-label="chart canvas" />;
}
