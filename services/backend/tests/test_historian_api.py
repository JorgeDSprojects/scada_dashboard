import os
import sys
import tempfile
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DB_FILE = Path(tempfile.gettempdir()) / f"scada_backend_test_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

from app.main import app
from app.historian.seed import _seed_range

INVALID_BUCKET_DETAIL = (
    "Invalid bucket. Use format '<positive integer><s|m|h>', e.g. '1m'."
)


def _series_params(*, bucket: str) -> dict[str, str]:
    start_utc, end_utc = _seed_range()
    to_utc = end_utc - timedelta(minutes=1)
    if to_utc <= start_utc:
        to_utc = end_utc

    from_utc = max(start_utc, to_utc - timedelta(hours=1))
    if from_utc >= to_utc:
        to_utc = start_utc + timedelta(minutes=1)
        from_utc = start_utc

    return {
        "signals": "Gen_RPM",
        "from": from_utc.isoformat().replace("+00:00", "Z"),
        "to": to_utc.isoformat().replace("+00:00", "Z"),
        "bucket": bucket,
    }


def test_historian_signals_returns_available_signal_names() -> None:
    with TestClient(app) as client:
        response = client.get("/api/historian/signals")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert "Gen_RPM" in body


def test_historian_series_returns_bucketed_points() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/historian/series",
            params=_series_params(bucket="1m"),
        )

    assert response.status_code == 200
    body = response.json()
    assert "series" in body
    assert len(body["series"]) > 0


def test_historian_series_rejects_invalid_bucket() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/historian/series",
            params=_series_params(bucket="bad"),
        )

    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_BUCKET_DETAIL


def test_historian_series_rejects_empty_bucket() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/historian/series",
            params=_series_params(bucket=""),
        )

    assert response.status_code == 400
    assert response.json()["detail"] == INVALID_BUCKET_DETAIL
