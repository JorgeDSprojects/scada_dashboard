import os
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DB_FILE = Path(tempfile.gettempdir()) / f"scada_backend_test_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

from app.main import app

INVALID_BUCKET_DETAIL = (
    "Invalid bucket. Use format '<positive integer><s|m|h>', e.g. '1m'."
)


def _series_params(*, bucket: str) -> dict[str, str]:
    return {
        "signals": "Gen_RPM",
        "from": "2026-07-12T00:00:00Z",
        "to": "2026-07-12T01:00:00Z",
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
