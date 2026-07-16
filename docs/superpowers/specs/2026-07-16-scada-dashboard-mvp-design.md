# SCADA Dashboard MVP Design (Realtime + Historian Vertical Slice)

## 1. Scope and Intent

This document defines the approved MVP design for a SCADA dashboard web platform.

The MVP includes:
- Realtime monitoring end-to-end (simulator -> backend WebSocket gateway -> frontend widgets).
- Historian vertical slice end-to-end (PostgreSQL seeded with random historical data -> backend query API -> frontend rendering).
- Dashboard lifecycle from UI: create, edit, publish/draft, open, and delete.

The MVP does not include authentication/authorization (no login in this phase).

## 2. Product Goals

### Functional goals
- Build and save dashboards in an editor with draggable/resizable widgets.
- List saved dashboards in a main table and access them from there.
- Show live realtime data in fixed view for published realtime dashboards.
- Show historical data in fixed view for published historian dashboards.

### MVP completion criteria
- Main page supports list, edit, and delete (with confirmation).
- Editor supports widget creation with dropdown-driven configuration and signal/color assignment.
- Fixed view is read-only (no editing controls).
- Historian path is functional with real DB-backed data (not mock-only).
- Minimum test suite passes: unit + integration + basic e2e smoke.

## 3. Architecture

## 3.1 Services (Docker Compose)

The MVP uses 4 services:
1. `frontend` (React): main, editor, fixed view.
2. `backend` (FastAPI + Uvicorn): REST + WebSocket gateway + validation + historian API.
3. `simulator` (Python): emits fixed realtime signals from JSON configuration.
4. `postgres` (PostgreSQL): stores dashboards/widgets and historian samples.

### Networking rules
- Services communicate through Docker service DNS names (for example `backend`, `simulator`, `postgres`).
- No inter-container `localhost` usage.
- Internal network is mandatory; host ports are exposed only where needed for local access.

## 3.2 Data flow

### Realtime flow
`simulator` -> internal WS stream -> `backend` gateway -> frontend WS clients.

### Historian flow
Frontend historian request -> backend REST API -> PostgreSQL aggregated query -> frontend chart.

## 4. UI Information Architecture

## 4.1 Main view
- Shows a table with saved dashboards (only dashboards created/saved from editor).
- Columns: `name`, `description`, `pipeline`, `status`, `actions`.
- `status` values: `draft` or `published` (visible badge/column).
- Actions:
  - `Open`
  - `Edit`
  - `Delete` (requires confirmation)

### Open behavior
- `draft` dashboards open in `editor`.
- `published` dashboards open in `fixed view`.

## 4.2 Editor view

### Metadata controls
- `name`: textbox.
- `description`: textbox/textarea, max 500 chars.

### Widget configuration controls
- Dropdown: `pipeline` (`realtime` / `historian`) visible in MVP.
- Dropdown: `chart type` (filtered by pipeline rules).
- Signals block:
  - Dropdown to choose a signal.
  - `+ Add` button to append signal.
  - Color assignment per added signal (allowed palette: navy, red, green, yellow, black).
- Range block:
  - Realtime: fixed rolling window of last 15 minutes.
  - Historian: `from` + `to` date-time picker UX (flight booking style: clear start/end range selection).

### Layout controls
- `Launch widget` creates widget in grid.
- Grid supports drag, resize, and delete widget.
- Save controls:
  - `Save draft`
  - `Publish dashboard`

## 4.3 Fixed view
- Read-only dashboard rendering (no editor controls).
- Accessed from `main` for `published` dashboards.
- Realtime dashboards update continuously from WS stream.
- Historian dashboards render data from historian API according to selected range.

## 5. Dashboard State Model

### Dashboard status
- `draft`: editable working state.
- `published`: consumable in fixed view.

### Publishing rules in MVP
- Both `realtime` and `historian` dashboards can be published.
- Draft dashboards are not opened in fixed view from main.

## 6. Data Model

## 6.1 Core entities

### `dashboards`
- `id` (PK)
- `name`
- `description` (<= 500)
- `pipeline` (`realtime` | `historian`)
- `status` (`draft` | `published`)
- `created_at` (UTC)
- `updated_at` (UTC)

### `widgets`
- `id` (PK)
- `dashboard_id` (FK -> dashboards.id, cascade delete)
- `chart_type`
- `signals` (array/json)
- `colors` (array/json mapped to `signals`)
- `layout` (json with `x`, `y`, `w`, `h`)
- `config` (json; includes per-widget options)
- `created_at` (UTC)
- `updated_at` (UTC)

### `historian_samples`
- `id` (PK)
- `signal_name`
- `ts_utc`
- `value`

## 6.2 Realtime signal catalog

Simulator exposes fixed signal definitions from JSON (read-only in MVP UI):
- `Gen_RPM`
- `hydrolic_temp`
- `Gear_oil_temp`
- `Blades_PitchAngle`
- `Windspeed`
- `Prod_pwr`

## 6.3 Signal specification for simulator and historian seed

| Signal | Unit | Type | Min | Max | Frequency | Realtime waveform |
| --- | --- | --- | --- | --- | --- | --- |
| `Gen_RPM` | RPM | float | 0 | 2000 | 0.5 s | triangular |
| `hydrolic_temp` | C | float | -15 | 60 | 1 s | sinusoidal (sine) |
| `Gear_oil_temp` | C | float | -20 | 40 | 1 s | sinusoidal (cosine) |
| `Blades_PitchAngle` | deg | float | 0 | 360 | 2 s | pulse |
| `Windspeed` | m/s | float | 0 | 50 | 1 s | square |
| `Prod_pwr` | kW | float | 0 | 500 | 5 s | triangular |

Historian seed must generate 4 days of samples per signal using the same sampling frequencies as above, with random values constrained to each signal min/max range.

## 7. Realtime and Historian Rules

## 7.1 Chart availability by pipeline
- Realtime chart types:
  - `Smoothed Line Chart`
  - `Stacked Line Chart`
  - `Simple Gauge`
  - `Temperature Gauge`
- Historian chart type:
  - `Large Scale Area Chart`

### Multi-signal compatibility
- Multi-signal is allowed for line/stacked/area charts.
- Gauge chart types accept one signal only.
- Invalid combinations are rejected by backend validation.

## 7.2 Historian storage and query behavior
- Seed strategy:
  - On startup, if DB is empty, auto-seed 4 days of historian data per signal.
  - Seed values are random (for pipeline validation in MVP).
- Persistence strategy:
  - Data persists across restarts by default (volume-backed PostgreSQL).
  - `--reset` operation clears data and reseeds from scratch.
- Query strategy:
  - Historian API returns aggregated points by bucket interval (not raw-only for long ranges).
  - Backend stores time in UTC; frontend displays local browser time.

## 8. API and WebSocket Contracts

## 8.1 REST endpoints

### Dashboards
- `GET /api/dashboards`
- `POST /api/dashboards`
- `GET /api/dashboards/{id}`
- `PUT /api/dashboards/{id}`
- `DELETE /api/dashboards/{id}`

### Widgets
- `POST /api/dashboards/{id}/widgets`
- `PUT /api/widgets/{id}`
- `DELETE /api/widgets/{id}`

### Historian
- `GET /api/historian/signals`
- `GET /api/historian/series?signals=...&from=...&to=...&bucket=...`

## 8.2 WebSocket endpoint
- `GET /ws/realtime?dashboard_id=...`
- Backend sends normalized event payloads, at minimum:
  - `signal`
  - `value`
  - `ts_utc`

## 9. Validation, Error Handling, and Resilience

### Validation
- Reject unknown signal names.
- Reject invalid `pipeline`/`chart_type` combinations.
- Reject invalid time ranges (`from >= to`, unsupported window size).

### Errors
- `400` for invalid inputs.
- `404` for missing dashboard/widget.
- `409` for state conflicts if applicable.

### Realtime resilience
- Frontend auto-reconnects WebSocket with backoff.
- Widget-level connection state badge:
  - `connected`
  - `reconnecting`
  - `disconnected`

### Historian failure UX
- Widget shows scoped error state if historian request fails.
- Page stays usable; no full-page crash for single widget failure.

## 10. Local Operations and Scripts

Mandatory scripts under `scripts/`:
- `up.sh`
- `down.sh`
- `restart.sh`
- `logs.sh`
- `status.sh`

Recommended operation flags:
- `--build`
- `--detach`
- `--reset` (clear + reseed DB)

## 11. Testing Strategy

### Unit tests
- Backend validators (pipeline/chart rules, range checks, signal constraints).
- Historian bucket calculation logic.

### Integration tests
- REST contracts for dashboard/widget CRUD.
- Historian API contract with aggregated responses.
- WebSocket contract for realtime event stream.

### E2E smoke tests (minimum)
- Create dashboard from editor.
- Add widgets and publish.
- Open published dashboard in fixed view.
- Delete dashboard from main with confirmation.

## 12. Non-Goals for MVP

- Authentication/roles.
- Production-grade horizontal scaling.
- Complex analytics beyond requested charting and range exploration.

## 13. Acceptance Checklist

- Dockerized 4-service environment runs via scripts.
- Main/editor/fixed view behavior matches defined navigation and status rules.
- Realtime and historian pipelines both functional end-to-end.
- Persist-by-default data behavior works; `--reset` works.
- Required tests run and pass.
