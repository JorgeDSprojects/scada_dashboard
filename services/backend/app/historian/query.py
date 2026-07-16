from datetime import UTC, datetime, timedelta
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HistorianSample

_BUCKET_FORMAT_ERROR = (
    "Invalid bucket. Use format '<positive integer><s|m|h>', e.g. '1m'."
)
_BUCKET_PATTERN = re.compile(r"^([1-9][0-9]*)([smh])$")


def _parse_bucket(bucket: str) -> timedelta:
    match = _BUCKET_PATTERN.fullmatch(bucket.strip())
    if match is None:
        raise ValueError(_BUCKET_FORMAT_ERROR)

    amount = int(match.group(1))
    unit = match.group(2)

    if unit == "s":
        return timedelta(seconds=amount)
    if unit == "m":
        return timedelta(minutes=amount)
    if unit == "h":
        return timedelta(hours=amount)
    raise ValueError(_BUCKET_FORMAT_ERROR)


def _normalize_utc(value: datetime | str) -> datetime:
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(UTC)

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def run_bucket_query(
    session: Session,
    signals: list[str],
    from_utc: datetime,
    to_utc: datetime,
    bucket: str,
) -> list[dict[str, object]]:
    if not signals:
        return []

    bucket_size = _parse_bucket(bucket)
    from_utc = _normalize_utc(from_utc)
    to_utc = _normalize_utc(to_utc)
    bucket_seconds = int(bucket_size.total_seconds())

    stmt = (
        select(HistorianSample.signal_name, HistorianSample.ts_utc, HistorianSample.value)
        .where(HistorianSample.signal_name.in_(signals))
        .where(HistorianSample.ts_utc >= from_utc)
        .where(HistorianSample.ts_utc <= to_utc)
        .order_by(HistorianSample.signal_name, HistorianSample.ts_utc)
    )

    grouped: dict[tuple[str, datetime], tuple[float, int]] = {}
    for signal_name, ts_utc, value in session.execute(stmt).all():
        ts = _normalize_utc(ts_utc)
        bucket_epoch = int(ts.timestamp()) // bucket_seconds * bucket_seconds
        bucket_ts = datetime.fromtimestamp(bucket_epoch, tz=UTC)
        key = (signal_name, bucket_ts)
        total, count = grouped.get(key, (0.0, 0))
        grouped[key] = (total + float(value), count + 1)

    points: list[dict[str, object]] = []
    for (signal_name, bucket_ts), (total, count) in sorted(grouped.items()):
        points.append(
            {
                "signal": signal_name,
                "ts_utc": bucket_ts.isoformat().replace("+00:00", "Z"),
                "value": round(total / count, 3),
            }
        )
    return points


def query_series(
    session: Session,
    signals: list[str],
    from_utc: datetime,
    to_utc: datetime,
    bucket: str,
) -> dict[str, object]:
    points = run_bucket_query(session, signals, from_utc, to_utc, bucket)
    return {"series": points, "bucket": bucket}
