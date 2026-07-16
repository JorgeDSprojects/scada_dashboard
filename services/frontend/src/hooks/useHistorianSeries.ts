import React from "react";

import { buildApiUrl } from "../api/client";

export type HistorianPoint = {
  signal: string;
  value: number;
  ts_utc: string;
};

type UseHistorianSeriesParams = {
  enabled: boolean;
  signals: string[];
  from: string;
  to: string;
  bucket: string;
};

function toUtcIsoString(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function parsePoint(entry: unknown): HistorianPoint | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const point = entry as Record<string, unknown>;
  if (
    typeof point.signal !== "string" ||
    typeof point.value !== "number" ||
    typeof point.ts_utc !== "string"
  ) {
    return null;
  }

  return {
    signal: point.signal,
    value: point.value,
    ts_utc: point.ts_utc,
  };
}

export function useHistorianSeries({ enabled, signals, from, to, bucket }: UseHistorianSeriesParams) {
  const [series, setSeries] = React.useState<HistorianPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || signals.length === 0) {
      setSeries([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      signals: signals.join(","),
      from: toUtcIsoString(from),
      to: toUtcIsoString(to),
      bucket,
    });

    const loadSeries = async () => {
      setLoading(true);

      try {
        const response = await fetch(buildApiUrl(`/api/historian/series?${query.toString()}`), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { series?: unknown[] };
        const parsed = Array.isArray(payload.series)
          ? payload.series
              .map((entry) => parsePoint(entry))
              .filter((entry): entry is HistorianPoint => entry !== null)
          : [];

        setSeries(parsed);
        setError(null);
      } catch (errorValue) {
        if (!controller.signal.aborted) {
          setError(errorValue instanceof Error ? errorValue.message : "Unable to load historian series.");
          setSeries([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadSeries();

    return () => {
      controller.abort();
    };
  }, [enabled, signals, from, to, bucket]);

  return { series, loading, error };
}
