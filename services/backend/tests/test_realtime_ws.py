import os
import sys
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DB_FILE = Path(tempfile.gettempdir()) / f"scada_backend_test_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

import app.main as main_module


class StubRealtimeManager:
    def __init__(self):
        self._sent_once = False

    async def next_event(self, dashboard_id: int) -> dict[str, object]:
        if self._sent_once:
            raise WebSocketDisconnect(code=1000)

        self._sent_once = True
        return {"signal": "Gen_RPM", "value": 1.0, "ts_utc": "2026-01-01T00:00:00Z"}


def test_ws_endpoint_exists(monkeypatch):
    monkeypatch.setattr(main_module, "manager", StubRealtimeManager(), raising=False)

    with TestClient(main_module.app) as client:
        with client.websocket_connect("/ws/realtime?dashboard_id=1") as ws:
            data = ws.receive_json()

    assert {"signal", "value", "ts_utc"}.issubset(data.keys())
