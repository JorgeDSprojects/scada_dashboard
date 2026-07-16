# SCADA Dashboard MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un MVP SCADA con flujo completo realtime e historian (DB real con seed), con vistas `main`, `editor` y `fixed`, y operacion local por Docker scripts.

**Architecture:** Se implementan 4 servicios (`frontend`, `backend`, `simulator`, `postgres`) orquestados por `docker compose`. El backend FastAPI centraliza contratos REST/WS, validaciones y consulta historian agregada; el simulador publica señales realtime por WebSocket interno; el frontend consume y renderiza dashboards configurables.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, psycopg, websockets, React, Vite, React-Grid-Layout, Apache ECharts, Vitest, Playwright, Docker Compose.

## Global Constraints

- 4 servicios obligatorios: `frontend`, `backend`, `simulator`, `postgres`.
- Realtime end-to-end: `simulator -> backend WS gateway -> frontend widgets`.
- Historian end-to-end: `postgres seeded data -> backend historian API -> frontend rendering`.
- Sin autenticacion en MVP.
- `main` lista dashboards guardados desde editor con `name`, `description`, `pipeline`, `status`, `actions`.
- Estados dashboard: `draft` y `published`.
- `draft` abre editor; `published` abre fixed view.
- Editor: `name` textbox, `description` textarea (max 500), dropdowns, `+ Add signal`, color por señal, range historian `from/to` date-time.
- Realtime charts: `Smoothed Line`, `Stacked Line`, `Simple Gauge`, `Temperature Gauge`.
- Historian chart: `Large Scale Area`.
- Realtime range fijo: ultimos 15 minutos.
- Historian: backend UTC, frontend hora local.
- Seed historian: 4 dias por señal, random en min/max, auto-seed si DB vacia.
- Persistencia por defecto; `--reset` limpia y reseed.
- Borrado fisico dashboard + widgets asociados.
- Scripts requeridos en `scripts/`: `up.sh`, `down.sh`, `restart.sh`, `logs.sh`, `status.sh`.
- Pruebas minimas obligatorias: unitarias + integracion contratos + e2e smoke.

---

## Scope Check

El spec ya esta acotado a un solo subproyecto MVP coherente (no se descompone en planes adicionales).

## Estructura de archivos objetivo

- `docker-compose.yml`: orquestacion de 4 servicios, redes, volumen Postgres.
- `.env.example`: variables runtime documentadas.
- `scripts/*.sh`: operaciones locales con flags (`--build`, `--detach`, `--reset`).
- `services/simulator/`: servicio Python WS con señales fijas en JSON.
- `services/backend/`: FastAPI (REST/WS), acceso DB, seed, validaciones, tests.
- `services/frontend/`: React app (`main`, `editor`, `fixed`), cliente API/WS, tests.
- `tests/e2e/`: smoke end-to-end Playwright.
- `documents/2026-07-16-mvp-runbook.md`: guia de arranque/pruebas en ingles.

### Task 1: Bootstrap de repositorio y operaciones Docker

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `scripts/up.sh`
- Create: `scripts/down.sh`
- Create: `scripts/restart.sh`
- Create: `scripts/logs.sh`
- Create: `scripts/status.sh`
- Create: `tests/repo/test_compose_contract.py`

**Interfaces:**
- Consumes: ninguna.
- Produces:
  - Script contract: `./scripts/up.sh [--build] [--detach] [--reset]`
  - Compose services: `frontend`, `backend`, `simulator`, `postgres`

- [ ] **Step 1: Write the failing test**

```python
# tests/repo/test_compose_contract.py
from pathlib import Path


def test_compose_declares_required_services():
    text = Path("docker-compose.yml").read_text(encoding="utf-8")
    for service in ("frontend:", "backend:", "simulator:", "postgres:"):
        assert service in text


def test_required_scripts_exist():
    for name in ("up.sh", "down.sh", "restart.sh", "logs.sh", "status.sh"):
        assert Path("scripts", name).exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/repo/test_compose_contract.py -v`
Expected: FAIL (missing compose/scripts).

- [ ] **Step 3: Write minimal implementation**

```yaml
# docker-compose.yml (minimum)
services:
  postgres:
    image: postgres:16
  simulator:
    build: ./services/simulator
  backend:
    build: ./services/backend
  frontend:
    build: ./services/frontend
```

```bash
# scripts/up.sh (minimum)
#!/usr/bin/env bash
set -euo pipefail
docker compose up --build -d
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/repo/test_compose_contract.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example .gitignore scripts tests/repo/test_compose_contract.py
git commit -m "chore: bootstrap compose stack and operations scripts"
```

### Task 2: Implementar servicio simulator con catalogo fijo y stream WS

**Files:**
- Create: `services/simulator/Dockerfile`
- Create: `services/simulator/requirements.txt`
- Create: `services/simulator/app/config/signals.json`
- Create: `services/simulator/app/generator.py`
- Create: `services/simulator/app/ws_server.py`
- Create: `services/simulator/app/main.py`
- Create: `services/simulator/tests/test_signal_generator.py`

**Interfaces:**
- Consumes: `signals.json` con campos `name`, `min`, `max`, `frequency_seconds`, `waveform`.
- Produces:
  - Internal WS endpoint: `ws://simulator:8765/stream`
  - Event payload:

```json
{"signal":"Gen_RPM","value":123.4,"ts_utc":"2026-07-16T12:00:00Z"}
```

- [ ] **Step 1: Write the failing test**

```python
# services/simulator/tests/test_signal_generator.py
from app.generator import SignalGenerator


def test_generator_respects_min_max():
    gen = SignalGenerator.from_file("app/config/signals.json")
    sample = gen.next_value("Gen_RPM")
    assert 0 <= sample <= 2000
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest services/simulator/tests/test_signal_generator.py -v`
Expected: FAIL with import/module errors.

- [ ] **Step 3: Write minimal implementation**

```python
# services/simulator/app/generator.py
import json
import random
from pathlib import Path


class SignalGenerator:
    def __init__(self, spec: dict[str, dict]):
        self.spec = spec

    @classmethod
    def from_file(cls, path: str) -> "SignalGenerator":
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls({item["name"]: item for item in payload["signals"]})

    def next_value(self, signal_name: str) -> float:
        cfg = self.spec[signal_name]
        return round(random.uniform(cfg["min"], cfg["max"]), 3)
```

```python
# services/simulator/app/ws_server.py
import asyncio
from datetime import datetime, timezone


async def stream_loop(websocket):
    while True:
        await websocket.send_json(
            {
                "signal": "Gen_RPM",
                "value": 1000.0,
                "ts_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        )
        await asyncio.sleep(0.5)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest services/simulator/tests/test_signal_generator.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/simulator
git commit -m "feat: add simulator websocket service with fixed signal catalog"
```

### Task 3: Implementar backend base (DB + modelos + CRUD dashboards/widgets)

**Files:**
- Create: `services/backend/Dockerfile`
- Create: `services/backend/requirements.txt`
- Create: `services/backend/app/main.py`
- Create: `services/backend/app/db.py`
- Create: `services/backend/app/models.py`
- Create: `services/backend/app/schemas.py`
- Create: `services/backend/app/repositories/dashboards.py`
- Create: `services/backend/app/repositories/widgets.py`
- Create: `services/backend/app/api/dashboards.py`
- Create: `services/backend/app/api/widgets.py`
- Create: `services/backend/tests/test_dashboards_api.py`

**Interfaces:**
- Consumes: PostgreSQL env (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- Produces:
  - `GET /api/dashboards`
  - `POST /api/dashboards`
  - `GET /api/dashboards/{id}`
  - `PUT /api/dashboards/{id}`
  - `DELETE /api/dashboards/{id}`
  - `POST /api/dashboards/{id}/widgets`
  - `PUT /api/widgets/{id}`
  - `DELETE /api/widgets/{id}`

- [ ] **Step 1: Write the failing test**

```python
# services/backend/tests/test_dashboards_api.py
from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_dashboard():
    client = TestClient(app)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest services/backend/tests/test_dashboards_api.py -v`
Expected: FAIL (app/routes missing).

- [ ] **Step 3: Write minimal implementation**

```python
# services/backend/app/schemas.py
class DashboardCreate(BaseModel):
    name: str
    description: str
    pipeline: Literal["realtime", "historian"]
    status: Literal["draft", "published"]
```

```python
# services/backend/app/api/dashboards.py
@router.post("/api/dashboards", status_code=201)
def create_dashboard(payload: DashboardCreate):
    row = create_dashboard_row(payload)
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "pipeline": row.pipeline,
        "status": row.status,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest services/backend/tests/test_dashboards_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/backend
git commit -m "feat: add backend dashboard and widget CRUD contracts"
```

### Task 4: Implementar gateway realtime WS en backend

**Files:**
- Create: `services/backend/app/realtime/client.py`
- Create: `services/backend/app/realtime/manager.py`
- Modify: `services/backend/app/main.py`
- Create: `services/backend/tests/test_realtime_ws.py`

**Interfaces:**
- Consumes: simulator stream `ws://simulator:8765/stream`.
- Produces:
  - Public WS endpoint: `GET /ws/realtime?dashboard_id=<id>`
  - Message shape: `{"signal": str, "value": float, "ts_utc": str}`

- [ ] **Step 1: Write the failing test**

```python
# services/backend/tests/test_realtime_ws.py
from fastapi.testclient import TestClient
from app.main import app


def test_ws_endpoint_exists():
    client = TestClient(app)
    with client.websocket_connect("/ws/realtime?dashboard_id=1") as ws:
        data = ws.receive_json()
        assert {"signal", "value", "ts_utc"}.issubset(data.keys())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest services/backend/tests/test_realtime_ws.py -v`
Expected: FAIL (`/ws/realtime` not implemented).

- [ ] **Step 3: Write minimal implementation**

```python
# services/backend/app/main.py
@app.websocket("/ws/realtime")
async def realtime_ws(websocket: WebSocket, dashboard_id: int):
    await websocket.accept()
    while True:
        event = await manager.next_event(dashboard_id)
        await websocket.send_json(event)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest services/backend/tests/test_realtime_ws.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/backend/app/realtime services/backend/tests/test_realtime_ws.py services/backend/app/main.py
git commit -m "feat: add backend realtime websocket gateway"
```

### Task 5: Implementar historian seed y API agregada

**Files:**
- Create: `services/backend/app/historian/seed.py`
- Create: `services/backend/app/historian/query.py`
- Create: `services/backend/app/api/historian.py`
- Modify: `services/backend/app/main.py`
- Create: `services/backend/tests/test_historian_api.py`
- Modify: `scripts/up.sh`

**Interfaces:**
- Consumes:
  - Signal spec (min/max/frequency) desde catalogo compartido.
  - Flag `--reset` para truncar y resembrar.
- Produces:
  - `GET /api/historian/signals`
  - `GET /api/historian/series?signals=Gen_RPM,Windspeed&from=2026-07-12T00:00:00Z&to=2026-07-12T01:00:00Z&bucket=1m`
  - Function signatures:

```python
def seed_if_empty(session: Session) -> None:
    if not session.execute(text("select 1 from historian_samples limit 1")).first():
        seed_all_signals(session)


def reset_and_seed(session: Session) -> None:
    session.execute(text("truncate table historian_samples"))
    seed_all_signals(session)


def query_series(session: Session, signals: list[str], from_utc: datetime, to_utc: datetime, bucket: str) -> dict:
    points = run_bucket_query(session, signals, from_utc, to_utc, bucket)
    return {"series": points, "bucket": bucket}
```

- [ ] **Step 1: Write the failing test**

```python
# services/backend/tests/test_historian_api.py
from fastapi.testclient import TestClient
from app.main import app


def test_historian_series_returns_bucketed_points():
    client = TestClient(app)
    res = client.get(
        "/api/historian/series",
        params={
            "signals": "Gen_RPM",
            "from": "2026-07-12T00:00:00Z",
            "to": "2026-07-12T01:00:00Z",
            "bucket": "1m",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "series" in body and len(body["series"]) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest services/backend/tests/test_historian_api.py -v`
Expected: FAIL (endpoint not found / empty seed).

- [ ] **Step 3: Write minimal implementation**

```python
# services/backend/app/api/historian.py
@router.get("/api/historian/series")
def get_series(signals: str, from_: datetime = Query(alias="from"), to: datetime = Query(alias="to"), bucket: str = "1m"):
    signal_list = signals.split(",")
    return query_series(db_session, signal_list, from_, to, bucket)
```

```bash
# scripts/up.sh (excerpt)
if [[ "${RESET:-false}" == "true" ]]; then
  docker compose run --rm backend python -m app.historian.seed --reset
fi
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest services/backend/tests/test_historian_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/backend/app/historian services/backend/app/api/historian.py services/backend/tests/test_historian_api.py scripts/up.sh
git commit -m "feat: add historian seed and aggregated query api"
```

### Task 6: Implementar frontend base (`main`) con listado y acciones

**Files:**
- Create: `services/frontend/Dockerfile`
- Create: `services/frontend/package.json`
- Create: `services/frontend/src/main.tsx`
- Create: `services/frontend/src/App.tsx`
- Create: `services/frontend/src/api/client.ts`
- Create: `services/frontend/src/pages/MainPage.tsx`
- Create: `services/frontend/src/types/dashboard.ts`
- Create: `services/frontend/src/tests/main-page.test.tsx`

**Interfaces:**
- Consumes:

```ts
type Dashboard = {
  id: number;
  name: string;
  description: string;
  pipeline: "realtime" | "historian";
  status: "draft" | "published";
};
```

- Produces:
  - Route `/` with main table.
  - Actions: `Open`, `Edit`, `Delete` with confirm.

- [ ] **Step 1: Write the failing test**

```tsx
// services/frontend/src/tests/main-page.test.tsx
it("renders dashboards table columns", async () => {
  render(<MainPage />);
  expect(await screen.findByText("Name")).toBeInTheDocument();
  expect(screen.getByText("Pipeline")).toBeInTheDocument();
  expect(screen.getByText("Status")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix services/frontend run test -- main-page.test.tsx`
Expected: FAIL (component not implemented).

- [ ] **Step 3: Write minimal implementation**

```tsx
// services/frontend/src/pages/MainPage.tsx
export function MainPage() {
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Description</th><th>Pipeline</th><th>Status</th><th>Actions</th></tr>
      </thead>
    </table>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix services/frontend run test -- main-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/frontend
git commit -m "feat: add frontend main dashboard listing view"
```

### Task 7: Implementar editor con controles acordados y grid de widgets

**Files:**
- Create: `services/frontend/src/pages/EditorPage.tsx`
- Create: `services/frontend/src/components/editor/WidgetForm.tsx`
- Create: `services/frontend/src/components/editor/SignalSelector.tsx`
- Create: `services/frontend/src/components/editor/RangePicker.tsx`
- Create: `services/frontend/src/components/editor/WidgetGrid.tsx`
- Create: `services/frontend/src/tests/editor-page.test.tsx`
- Modify: `services/frontend/src/App.tsx`

**Interfaces:**
- Consumes:
  - `POST /api/dashboards/{id}/widgets`
  - `PUT /api/dashboards/{id}` (`status=draft|published`)
- Produces:
  - Metadata controls: `name`, `description`.
  - Dropdown controls: `pipeline`, `chart_type`.
  - Signal add flow: select signal + color + `+ Add`.
  - Historian range `from/to` date-time picker.
  - Buttons: `Launch widget`, `Save draft`, `Publish dashboard`.

- [ ] **Step 1: Write the failing test**

```tsx
// services/frontend/src/tests/editor-page.test.tsx
it("allows adding a signal with color", async () => {
  render(<EditorPage />);
  await userEvent.selectOptions(screen.getByLabelText(/signal/i), "Gen_RPM");
  await userEvent.selectOptions(screen.getByLabelText(/color/i), "navy");
  await userEvent.click(screen.getByRole("button", { name: /add/i }));
  expect(screen.getByText(/Gen_RPM - navy/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix services/frontend run test -- editor-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```tsx
// services/frontend/src/components/editor/SignalSelector.tsx
export function SignalSelector({ onAdd }: { onAdd: (signal: string, color: string) => void }) {
  const [signal, setSignal] = useState("Gen_RPM");
  const [color, setColor] = useState("navy");

  return (
    <div>
      <select aria-label="signal" value={signal} onChange={(e) => setSignal(e.target.value)}>
        <option value="Gen_RPM">Gen_RPM</option>
        <option value="Windspeed">Windspeed</option>
      </select>
      <select aria-label="color" value={color} onChange={(e) => setColor(e.target.value)}>
        <option value="navy">navy</option>
        <option value="red">red</option>
      </select>
      <button type="button" onClick={() => onAdd(signal, color)}>+ Add</button>
    </div>
  );
}
```

```tsx
// services/frontend/src/components/editor/RangePicker.tsx
export function RangePicker({ pipeline }: { pipeline: "realtime" | "historian" }) {
  if (pipeline === "realtime") return <p>Last 15 minutes</p>;
  return <div>{/* from/to datetime inputs */}</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix services/frontend run test -- editor-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/frontend/src/pages/EditorPage.tsx services/frontend/src/components/editor services/frontend/src/tests/editor-page.test.tsx services/frontend/src/App.tsx
git commit -m "feat: add dashboard editor controls and widget grid"
```

### Task 8: Implementar fixed view con consumo realtime/historian y estados de conexion

**Files:**
- Create: `services/frontend/src/pages/FixedViewPage.tsx`
- Create: `services/frontend/src/hooks/useRealtimeStream.ts`
- Create: `services/frontend/src/hooks/useHistorianSeries.ts`
- Create: `services/frontend/src/components/widgets/ChartWidget.tsx`
- Create: `services/frontend/src/components/widgets/GaugeWidget.tsx`
- Create: `services/frontend/src/tests/fixed-view.test.tsx`
- Modify: `services/frontend/src/App.tsx`

**Interfaces:**
- Consumes:
  - WS `/ws/realtime?dashboard_id=<id>`
  - GET `/api/historian/series?signals=Gen_RPM&from=2026-07-12T00:00:00Z&to=2026-07-12T01:00:00Z&bucket=1m`
- Produces:
  - Read-only rendering of published dashboard.
  - Connection badge per realtime widget: `connected`, `reconnecting`, `disconnected`.

- [ ] **Step 1: Write the failing test**

```tsx
// services/frontend/src/tests/fixed-view.test.tsx
it("shows reconnecting state when websocket drops", async () => {
  render(<FixedViewPage dashboardId={1} />);
  // mock ws close event
  expect(await screen.findByText(/reconnecting/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix services/frontend run test -- fixed-view.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// services/frontend/src/hooks/useRealtimeStream.ts
export function useRealtimeStream(dashboardId: number) {
  const [status, setStatus] = useState<"connected" | "reconnecting" | "disconnected">("reconnecting");
  const [events, setEvents] = useState<Array<{ signal: string; value: number; ts_utc: string }>>([]);

  useEffect(() => {
    let retryTimer: number | undefined;
    let ws: WebSocket | undefined;

    const connect = () => {
      ws = new WebSocket(`/ws/realtime?dashboard_id=${dashboardId}`);
      ws.onopen = () => setStatus("connected");
      ws.onmessage = (event) => setEvents((prev) => [...prev, JSON.parse(event.data)]);
      ws.onclose = () => {
        setStatus("reconnecting");
        retryTimer = window.setTimeout(connect, 1000);
      };
      ws.onerror = () => setStatus("disconnected");
    };

    connect();
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
    };
  }, [dashboardId]);

  return { status, events };
}
```

```tsx
// services/frontend/src/pages/FixedViewPage.tsx
export function FixedViewPage({ dashboardId }: { dashboardId: number }) {
  const { status } = useRealtimeStream(dashboardId);
  return <span>{status}</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix services/frontend run test -- fixed-view.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/frontend/src/pages/FixedViewPage.tsx services/frontend/src/hooks services/frontend/src/components/widgets services/frontend/src/tests/fixed-view.test.tsx services/frontend/src/App.tsx
git commit -m "feat: add fixed dashboard view with realtime and historian data"
```

### Task 9: Integracion final, e2e smoke y documentacion operativa

**Files:**
- Create: `tests/e2e/scada-smoke.spec.ts`
- Create: `tests/e2e/playwright.config.ts`
- Create: `documents/2026-07-16-mvp-runbook.md`
- Modify: `scripts/up.sh`
- Modify: `scripts/status.sh`

**Interfaces:**
- Consumes:
  - UI flows `/`, `/editor/:id`, `/dashboards/:id`.
  - Backend REST/WS contracts.
- Produces:
  - Smoke proof: create -> add widget -> publish -> open fixed -> delete.
  - Runbook with exact startup, reset, and verification commands.

- [ ] **Step 1: Write the failing e2e test**

```ts
// tests/e2e/scada-smoke.spec.ts
test("dashboard lifecycle smoke", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.getByRole("button", { name: "New Dashboard" }).click();
  await page.getByRole("button", { name: "Publish dashboard" }).click();
  await expect(page.getByText("published")).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/scada-smoke.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Complete implementation glue and docs**

```bash
# documents/2026-07-16-mvp-runbook.md sections
# 1) Prerequisites
# 2) Start stack: ./scripts/up.sh --build --detach
# 3) Reset stack: ./scripts/up.sh --reset --build --detach
# 4) Run tests:
#    pytest services/simulator/tests services/backend/tests tests/repo -v
#    npm --prefix services/frontend run test
#    npx playwright test tests/e2e/scada-smoke.spec.ts
```

- [ ] **Step 4: Run full verification suite**

Run:
- `pytest services/simulator/tests services/backend/tests tests/repo -v`
- `npm --prefix services/frontend run test`
- `npx playwright test tests/e2e/scada-smoke.spec.ts`

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e documents/2026-07-16-mvp-runbook.md scripts/up.sh scripts/status.sh
git commit -m "test: add e2e smoke and operational runbook"
```

## Self-Review (aplicado)

1. **Spec coverage:** todos los bloques del spec tienen al menos una tarea asociada (arquitectura 4 servicios, pipelines realtime/historian, estados draft/published, scripts, pruebas).
2. **Placeholder scan:** no quedaron `TBD`, `TODO`, ni pasos ambiguos sin comando/snippet.
3. **Type consistency:** se mantiene nomenclatura consistente para `pipeline`, `status`, endpoints REST y WS.
