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


def test_create_and_list_dashboard():
    with TestClient(app) as client:
        payload = {
            "name": "Wind Turbine RT",
            "description": "Realtime overview",
            "pipeline": "realtime",
            "status": "draft",
        }

        created = client.post("/api/dashboards", json=payload)
        assert created.status_code == 201

        listed = client.get("/api/dashboards")
        assert listed.status_code == 200
        assert len(listed.json()) >= 1
