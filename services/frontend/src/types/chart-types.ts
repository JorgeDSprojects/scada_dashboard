export const CHART_TYPE_ALIASES: Record<string, string> = {
  line: "smoothed_line",
  gauge: "simple_gauge",
  area: "large_scale_area",
};

export const CHART_TYPE_OPTIONS = {
  realtime: ["smoothed_line", "stacked_line", "simple_gauge", "temperature_gauge"],
  historian: ["large_scale_area"],
} as const;

export function normalizeChartType(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-+/g, "_");
  return CHART_TYPE_ALIASES[normalized] ?? normalized;
}
