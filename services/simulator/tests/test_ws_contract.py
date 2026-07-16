import sys
from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.main import app


def test_stream_contract_emits_expected_payload_keys():
    with TestClient(app) as client:
        with client.websocket_connect("/stream") as websocket:
            payload = websocket.receive_json()

    assert set(("signal", "value", "ts_utc")).issubset(payload.keys())
    assert isinstance(payload["signal"], str)
    assert isinstance(payload["value"], (int, float))
    datetime.fromisoformat(payload["ts_utc"].replace("Z", "+00:00"))
