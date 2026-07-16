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


def _create_dashboard(client: TestClient, suffix: str) -> dict[str, object]:
    payload = {
        "name": f"Wind Turbine RT {suffix}",
        "description": "Realtime overview",
        "pipeline": "realtime",
        "status": "draft",
    }
    created = client.post("/api/dashboards", json=payload)
    assert created.status_code == 201
    return created.json()


def _create_widget(client: TestClient, dashboard_id: int, suffix: str) -> dict[str, object]:
    payload = {
        "name": f"Power KPI {suffix}",
        "widget_type": "line",
        "settings": {
            "chart_type": "line",
            "pipeline": "realtime",
            "signals": ["Gen_RPM"],
            "colors": ["navy"],
            "layout": {"x": 0, "y": 0, "w": 4, "h": 6},
        },
    }
    created = client.post(f"/api/dashboards/{dashboard_id}/widgets", json=payload)
    assert created.status_code == 201
    return created.json()


def test_create_and_list_dashboard():
    with TestClient(app) as client:
        _create_dashboard(client, "list")

        listed = client.get("/api/dashboards")
        assert listed.status_code == 200
        assert len(listed.json()) >= 1


def test_get_dashboard_by_id_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "get")

        fetched = client.get(f"/api/dashboards/{dashboard['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["id"] == dashboard["id"]


def test_update_dashboard_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "update")

        updated = client.put(
            f"/api/dashboards/{dashboard['id']}",
            json={"name": "Wind Turbine Updated", "status": "published"},
        )
        assert updated.status_code == 200
        body = updated.json()
        assert body["name"] == "Wind Turbine Updated"
        assert body["status"] == "published"


def test_delete_dashboard_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "delete")

        deleted = client.delete(f"/api/dashboards/{dashboard['id']}")
        assert deleted.status_code == 204

        fetched = client.get(f"/api/dashboards/{dashboard['id']}")
        assert fetched.status_code == 404


def test_create_widget_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "widget-create")

        created_widget = _create_widget(client, int(dashboard["id"]), "create")
        assert created_widget["dashboard_id"] == dashboard["id"]
        assert created_widget["widget_type"] == "line"


def test_update_widget_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "widget-update")
        widget = _create_widget(client, int(dashboard["id"]), "update")

        updated = client.put(
            f"/api/widgets/{widget['id']}",
            json={
                "name": "Power KPI Updated",
                "settings": {
                    "chart_type": "line",
                    "pipeline": "realtime",
                    "signals": ["Gen_RPM"],
                    "colors": ["red"],
                    "layout": {"x": 1, "y": 0, "w": 4, "h": 6},
                },
            },
        )
        assert updated.status_code == 200
        body = updated.json()
        assert body["name"] == "Power KPI Updated"
        assert body["settings"]["colors"] == ["red"]


def test_delete_widget_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "widget-delete")
        widget = _create_widget(client, int(dashboard["id"]), "delete")

        deleted = client.delete(f"/api/widgets/{widget['id']}")
        assert deleted.status_code == 204

        updated = client.put(
            f"/api/widgets/{widget['id']}",
            json={"name": "Should Not Update"},
        )
        assert updated.status_code == 404


def test_create_widget_rejects_invalid_pipeline_chart_type_combination():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "invalid-chart")

        response = client.post(
            f"/api/dashboards/{dashboard['id']}/widgets",
            json={
                "name": "Invalid widget",
                "widget_type": "area",
                "settings": {
                    "chart_type": "area",
                    "pipeline": "realtime",
                    "signals": ["Gen_RPM"],
                    "colors": ["navy"],
                },
            },
        )

        assert response.status_code == 400
        assert "Chart type" in response.json()["detail"]


def test_create_widget_rejects_invalid_signal_catalog_values():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "invalid-signal")

        response = client.post(
            f"/api/dashboards/{dashboard['id']}/widgets",
            json={
                "name": "Invalid signal widget",
                "widget_type": "line",
                "settings": {
                    "chart_type": "line",
                    "pipeline": "realtime",
                    "signals": ["UnknownSignal"],
                    "colors": ["red"],
                },
            },
        )

        assert response.status_code == 400
        assert "Unknown signals" in response.json()["detail"]


def test_update_widget_rejects_invalid_signal_count_for_gauge():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "invalid-gauge-update")
        widget = _create_widget(client, int(dashboard["id"]), "gauge-update")

        response = client.put(
            f"/api/widgets/{widget['id']}",
            json={
                "widget_type": "gauge",
                "settings": {
                    "chart_type": "gauge",
                    "pipeline": "realtime",
                    "signals": ["Gen_RPM", "Windspeed"],
                    "colors": ["navy", "green"],
                },
            },
        )

        assert response.status_code == 400
        assert "requires exactly one signal" in response.json()["detail"]
