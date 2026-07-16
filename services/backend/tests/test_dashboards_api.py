import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DB_FILE = Path(tempfile.gettempdir()) / f"scada_backend_test_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"
os.environ.setdefault("HISTORIAN_MIN_SAMPLE_SECONDS", "300")

from app.main import app
from app.db import engine


def _create_dashboard(client: TestClient, suffix: str) -> dict[str, object]:
    payload = {
        "name": f"Wind Turbine RT {suffix}",
        "description": "Realtime overview",
        "pipeline": "realtime",
        "status": "draft",
    }
    created = client.post("/api/dashboards", json=payload)
    assert created.status_code == 201
    body = created.json()
    assert "created_at" in body
    assert "updated_at" in body
    return body


def _create_widget(client: TestClient, dashboard_id: int, suffix: str) -> dict[str, object]:
    payload = {
        "name": f"Power KPI {suffix}",
        "widget_type": "smoothed_line",
        "settings": {
            "chart_type": "smoothed_line",
            "pipeline": "realtime",
            "signals": ["Gen_RPM"],
            "colors": ["navy"],
            "layout": {"x": 0, "y": 0, "w": 4, "h": 6},
        },
    }
    created = client.post(f"/api/dashboards/{dashboard_id}/widgets", json=payload)
    assert created.status_code == 201
    body = created.json()
    assert "created_at" in body
    assert "updated_at" in body
    return body


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
        assert datetime.fromisoformat(body["updated_at"].replace("Z", "+00:00")) >= datetime.fromisoformat(
            dashboard["updated_at"].replace("Z", "+00:00")
        )


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
        assert created_widget["widget_type"] == "smoothed_line"


def test_update_widget_contract():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "widget-update")
        widget = _create_widget(client, int(dashboard["id"]), "update")

        updated = client.put(
            f"/api/widgets/{widget['id']}",
            json={
                "name": "Power KPI Updated",
                "settings": {
                    "chart_type": "smoothed_line",
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


def test_create_dashboard_rejects_description_longer_than_500_chars():
    with TestClient(app) as client:
        response = client.post(
            "/api/dashboards",
            json={
                "name": "Long description dashboard",
                "description": "x" * 501,
                "pipeline": "realtime",
                "status": "draft",
            },
        )

    assert response.status_code == 422


def test_update_dashboard_rejects_description_longer_than_500_chars():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "description-limit")

        response = client.put(
            f"/api/dashboards/{dashboard['id']}",
            json={"description": "x" * 501},
        )

    assert response.status_code == 422


def test_create_widget_rejects_invalid_pipeline_chart_type_combination():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "invalid-chart")

        response = client.post(
            f"/api/dashboards/{dashboard['id']}/widgets",
            json={
                "name": "Invalid widget",
                "widget_type": "area",
                "settings": {
                    "chart_type": "large_scale_area",
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


def test_create_widget_accepts_legacy_chart_type_aliases_for_compatibility():
    with TestClient(app) as client:
        dashboard = _create_dashboard(client, "legacy-alias")

        response = client.post(
            f"/api/dashboards/{dashboard['id']}/widgets",
            json={
                "name": "Legacy alias widget",
                "widget_type": "line",
                "settings": {
                    "chart_type": "line",
                    "pipeline": "realtime",
                    "signals": ["Gen_RPM"],
                    "colors": ["red"],
                },
            },
        )

        assert response.status_code == 201


def test_startup_migrates_legacy_tables_missing_timestamps():
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP TABLE IF EXISTS widgets")
        connection.exec_driver_sql("DROP TABLE IF EXISTS dashboards")
        connection.exec_driver_sql(
            """
            CREATE TABLE dashboards (
                id INTEGER PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                pipeline VARCHAR(40) NOT NULL,
                status VARCHAR(40) NOT NULL
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE widgets (
                id INTEGER PRIMARY KEY,
                dashboard_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                widget_type VARCHAR(100) NOT NULL,
                settings JSON NOT NULL,
                FOREIGN KEY(dashboard_id) REFERENCES dashboards(id)
            )
            """
        )
        connection.exec_driver_sql(
            """
            INSERT INTO dashboards (id, name, description, pipeline, status)
            VALUES (1, 'Legacy dashboard', 'Imported from persisted volume', 'realtime', 'draft')
            """
        )

    with TestClient(app) as client:
        response = client.get("/api/dashboards")

    assert response.status_code == 200
    body = response.json()
    assert body[0]["id"] == 1
    assert "created_at" in body[0]
    assert "updated_at" in body[0]

    with engine.begin() as connection:
        dashboard_columns = {
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info('dashboards')").fetchall()
        }
        widget_columns = {
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info('widgets')").fetchall()
        }

    assert {"created_at", "updated_at"}.issubset(dashboard_columns)
    assert {"created_at", "updated_at"}.issubset(widget_columns)
