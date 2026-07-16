from collections.abc import Sequence

from app.historian.seed import list_signal_names

REALTIME_CHART_TYPES = {"smoothed_line", "stacked_line", "simple_gauge", "temperature_gauge"}
HISTORIAN_CHART_TYPES = {"large_scale_area"}
GAUGE_CHART_TYPES = {"simple_gauge", "temperature_gauge"}
CHART_TYPE_ALIASES = {
    "line": "smoothed_line",
    "gauge": "simple_gauge",
    "area": "large_scale_area",
}


def _normalize_chart_type(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
    return CHART_TYPE_ALIASES.get(normalized, normalized)


def _extract_pipeline(settings: dict[str, object], dashboard_pipeline: str) -> str:
    pipeline_value = settings.get("pipeline")
    if isinstance(pipeline_value, str):
        return pipeline_value.strip().lower()
    return dashboard_pipeline.strip().lower()


def _extract_signals(settings: dict[str, object]) -> list[str]:
    raw_signals = settings.get("signals")
    if not isinstance(raw_signals, Sequence) or isinstance(raw_signals, (str, bytes)):
        return []

    return [value for value in raw_signals if isinstance(value, str)]


def validate_widget_configuration(
    *,
    dashboard_pipeline: str,
    widget_type: str,
    settings: dict[str, object],
) -> None:
    normalized_dashboard_pipeline = dashboard_pipeline.strip().lower()
    pipeline = _extract_pipeline(settings, normalized_dashboard_pipeline)
    if pipeline not in {"realtime", "historian"}:
        raise ValueError("Widget pipeline must be either 'realtime' or 'historian'.")

    if pipeline != normalized_dashboard_pipeline:
        raise ValueError(
            f"Widget pipeline '{pipeline}' must match dashboard pipeline '{normalized_dashboard_pipeline}'."
        )

    chart_type_value = settings.get("chart_type")
    chart_type = _normalize_chart_type(chart_type_value) if isinstance(chart_type_value, str) else _normalize_chart_type(widget_type)

    if pipeline == "realtime" and chart_type not in REALTIME_CHART_TYPES:
        raise ValueError(f"Chart type '{chart_type}' is not supported for realtime pipeline.")

    if pipeline == "historian" and chart_type not in HISTORIAN_CHART_TYPES:
        raise ValueError(f"Chart type '{chart_type}' is not supported for historian pipeline.")

    signals = _extract_signals(settings)
    if not signals:
        raise ValueError("Widget requires at least one signal.")

    known_signals = set(list_signal_names())
    unknown_signals = sorted(signal for signal in signals if signal not in known_signals)
    if unknown_signals:
        raise ValueError(f"Unknown signals: {', '.join(unknown_signals)}")

    if chart_type in GAUGE_CHART_TYPES and len(signals) != 1:
        raise ValueError(f"Chart type '{chart_type}' requires exactly one signal.")
