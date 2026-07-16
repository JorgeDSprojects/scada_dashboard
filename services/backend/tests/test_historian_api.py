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


def test_historian_series_returns_bucketed_points() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/historian/series",
            params={
                "signals": "Gen_RPM",
                "from": "2026-07-12T00:00:00Z",
                "to": "2026-07-12T01:00:00Z",
                "bucket": "1m",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert "series" in body
    assert len(body["series"]) > 0
