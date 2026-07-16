# Final Fix Wave Report (Blocker-to-Merge)

## Scope

This fix wave addresses the critical and important findings from whole-branch review for the SCADA Dashboard MVP.

## Implemented Fixes

### 1) Realtime WS operational by default

- Implemented an absolute WebSocket URL strategy in `services/frontend/src/api/client.ts`:
  - Converts relative `/ws/...` paths into absolute `ws://`/`wss://` URLs using browser origin fallback.
  - Supports `VITE_WS_BASE_URL` and conversion from `http(s)` to `ws(s)`.
- Added Vite WS proxy support in `services/frontend/vite.config.ts`:
  - `"/ws"` proxy configured with `ws: true` and `changeOrigin: true`.
- Added regression tests in `services/frontend/src/tests/api-client.test.ts` to catch invalid/non-absolute WS URL behavior.

### 2) Complete lifecycle from UI

- Added main-page UI creation flow:
  - `New dashboard` button now creates draft dashboards from UI and navigates to editor.
  - Implemented `createDashboard` client API call.
- Updated e2e smoke to create dashboards from UI (`tests/e2e/scada-smoke.spec.ts`) instead of API-only pre-seed.
- Editor now loads existing dashboard metadata and widget list for editing via `getDashboard`.

### 3) Editor draggable/resizable widget grid with persistence

- Replaced plain list with `react-grid-layout` in `services/frontend/src/components/editor/WidgetGrid.tsx`.
- Added drag/resize layout persistence path:
  - Layout updates trigger backend `PUT /api/widgets/{id}` via `updateWidget` API client.
  - Layout is stored in widget settings (`settings.layout`) and reloaded in editor.
- Added required dependencies:
  - `react-grid-layout`, `react-resizable`.

### 4) Backend validation for pipeline/chart_type/signals compatibility

- Added central validator: `services/backend/app/validators/widgets.py`.
- Enforced validation in create/update paths:
  - `POST /api/dashboards/{id}/widgets`
  - `PUT /api/widgets/{id}`
- Validation now rejects:
  - Dashboard/widget pipeline mismatch.
  - Invalid chart type by pipeline.
  - Unknown signals.
  - Invalid gauge signal count (must be exactly one).
- Added contract coverage in `services/backend/tests/test_dashboards_api.py` for invalid combinations.

### 5) Persist widget deletion from editor

- Editor delete action now calls backend `DELETE /api/widgets/{id}` before local removal.
- Added frontend client API method `deleteWidget`.
- Added frontend test coverage for backend-backed deletion.

### 6) Route alignment for fixed view

- Canonical fixed-view route aligned with plan: `/dashboards/:id`.
- Backward compatibility preserved with legacy `/fixed/:id` route.
- Main page Open action for published dashboards now targets `/dashboards/:id`.
- Updated tests and runbook to document this explicit compatibility decision.

### 7) Historian local time display in fixed view

- Historian/realtime chart timestamps are now rendered in browser local time in `ChartWidget`.
- Added frontend test coverage to prevent UTC-raw timestamp regressions.

## Runbook Update

- Updated `documents/2026-07-16-mvp-runbook.md` smoke scenario:
  - Explicit UI creation from `New dashboard`.
  - Canonical fixed-view route `/dashboards/:id` with `/fixed/:id` compatibility note.

## Verification Evidence

### Focused verification

- `npm --prefix services/frontend run test -- src/tests/api-client.test.ts src/tests/main-page.test.tsx src/tests/editor-page.test.tsx src/tests/fixed-view.test.tsx` ✅
- `pytest services/backend/tests/test_dashboards_api.py -v` ✅

### Full area verification

- `pytest services/backend/tests -v` ✅ (16 passed)
- `npm --prefix services/frontend run test` ✅ (19 passed)
- `npm --prefix services/frontend run build` ✅

### E2E smoke

- `npx playwright test tests/e2e/scada-smoke.spec.ts` ❌ in current session due environment not running:
  - `ERR_CONNECTION_REFUSED http://localhost:5173/`
  - Test flow itself is updated to UI-driven create and `/dashboards/:id` route assertions.

## Notes

- This wave intentionally keeps `/fixed/:id` for compatibility while adopting `/dashboards/:id` as canonical route.
- Existing unrelated workspace artifacts were not modified.

## Final-review blocker fixes (follow-up wave)

### 8) Critical blocker: Python `app` package collision across services

- Root cause: both `services/simulator` and `services/backend` exposed a top-level Python package named `app`, so combined pytest scopes could import the wrong module from `sys.modules`/`sys.path` ordering.
- Applied robust package rename for simulator:
  - Moved simulator package from `services/simulator/app/` to `services/simulator/simulator_app/`.
  - Updated simulator imports to `simulator_app.*` in service code and tests.
  - Updated simulator runtime paths (`simulator_app/config/signals.json`).
  - Updated simulator container entrypoint and copy path in `services/simulator/Dockerfile` to `simulator_app.main:app`.
- Result: backend keeps `app.*` while simulator now uses a service-unique package name, eliminating cross-service import cross-talk in combined runs.

### 9) Important blocker: real WS reconnect backoff (exponential + cap)

- Updated `services/frontend/src/hooks/useRealtimeStream.ts` reconnect scheduling:
  - Base delay: `1000ms`
  - Backoff: exponential (`1s`, `2s`, `4s`, ...)
  - Cap: `30000ms`
  - Reconnect attempt counter resets on successful socket open.
- Added regression coverage in `services/frontend/src/tests/use-realtime-stream.test.tsx`:
  - Verifies reconnect delays follow exponential progression.
  - Verifies delays are capped at `30000ms`.

### Verification evidence for this follow-up wave

- `pytest services/simulator/tests services/backend/tests tests/repo -v` ✅ (20 passed)
- `npm --prefix services/frontend run test` ✅ (20 passed)

## Final-review remaining issues (final fix commit wave)

### 10) Critical: backend historian seed catalog path resolution in Docker context

- Removed fragile `parents[4]` indexing in `services/backend/app/historian/seed.py`.
- Added robust candidate discovery via `_catalog_candidates_from_seed_path(...)`:
  - Supports renamed simulator package path: `services/simulator/simulator_app/config/signals.json`.
  - Keeps legacy fallback path compatibility: `services/simulator/app/config/signals.json`.
  - Handles shallow path trees safely (no startup `IndexError` in container-style layouts).
- Added regression tests in `services/backend/tests/test_historian_seed.py` for shallow paths and renamed simulator catalog resolution.

### 11) Important: backend API validation for dashboard `description` max length 500

- Enforced `max_length=500` in backend schemas:
  - `DashboardBase.description`
  - `DashboardUpdate.description`
- Added API contract tests in `services/backend/tests/test_dashboards_api.py`:
  - create dashboard rejects description length `>500`.
  - update dashboard rejects description length `>500`.

### 12) Important: frontend SignalSelector exposes full 6-signal catalog

- Updated default signal options in `services/frontend/src/components/editor/SignalSelector.tsx` to match spec:
  - `Gen_RPM`, `hydrolic_temp`, `Gear_oil_temp`, `Blades_PitchAngle`, `Windspeed`, `Prod_pwr`.
- Added frontend regression test in `services/frontend/src/tests/editor-page.test.tsx` to lock full six-signal selector coverage.

### Verification evidence for final fix wave

- `pytest services/backend/tests tests/repo -v` ✅ (22 passed)
- `npm --prefix services/frontend run test` ✅ (21 passed)
- `docker compose config` ✅

## Final spec-alignment fixes (post-review)

### 13) Critical: historian seed now honors catalog frequency by default

- Updated `services/backend/app/historian/seed.py` sampling interval behavior:
  - Removed implicit hard floors (`60s`/`300s`) from default runtime behavior.
  - Default seeding interval now follows each signal `frequency_seconds` from catalog.
  - Added explicit optional override support via `HISTORIAN_MIN_SAMPLE_SECONDS` for practical test/runtime throttling when needed.
- Added regression coverage in `services/backend/tests/test_historian_seed.py`:
  - default path uses catalog frequency without floor.
  - explicit override floor still works.
- Set `HISTORIAN_MIN_SAMPLE_SECONDS=300` in backend API test modules to keep CI/test runtime practical while preserving default production behavior.

### 14) Important: simulator now uses configured waveforms

- Implemented waveform-aware generation in `services/simulator/simulator_app/generator.py`:
  - Supports `triangular`, `sine`, `cosine`, `pulse`, `square` from signal catalog.
  - Uses per-signal phase progression (`waveform_step`, defaulted when omitted) and maps normalized waveform output to `[min, max]`.
  - Keeps random fallback for unknown/unspecified waveform values.
- Added deterministic waveform regression test in `services/simulator/tests/test_signal_generator.py`.

### 15) Important: editor chart options aligned with spec naming + compatibility

- Added canonical chart-type normalization in frontend and backend:
  - Canonical names: `smoothed_line`, `stacked_line`, `simple_gauge`, `temperature_gauge`, `large_scale_area`.
  - Legacy aliases preserved for compatibility (`line`, `gauge`, `area`).
- Frontend:
  - Added `services/frontend/src/types/chart-types.ts`.
  - Updated editor option lists in `services/frontend/src/components/editor/WidgetForm.tsx`.
  - Normalized loaded/created widget chart types in editor and fixed view pages.
- Backend:
  - Updated validation sets and alias normalization in `services/backend/app/validators/widgets.py`.
  - Added API contract test for legacy alias acceptance in `services/backend/tests/test_dashboards_api.py`.

### 16) Important: added `created_at` and `updated_at` for dashboards/widgets

- Added timestamp columns to ORM models in `services/backend/app/models.py`:
  - `Dashboard.created_at`, `Dashboard.updated_at`
  - `Widget.created_at`, `Widget.updated_at`
- Exposed timestamps in read schemas in `services/backend/app/schemas.py`.
- Extended backend API tests to validate timestamp presence and update monotonicity.
- Updated frontend domain types and test fixtures to include new timestamp fields:
  - `services/frontend/src/types/dashboard.ts`
  - affected frontend tests under `services/frontend/src/tests/`.

### Verification evidence for this spec-alignment wave

- `pytest services/simulator/tests services/backend/tests tests/repo -v` ✅ (28 passed)
- `npm --prefix services/frontend run test` ✅ (22 passed)

## Latest final-review blockers fix wave

### 17) Critical: startup compatibility migration for persisted Postgres volumes

- Added startup compatibility migrations in `services/backend/app/db.py` and wired them in `services/backend/app/main.py`.
- On startup, backend now executes idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for PostgreSQL timestamp columns:
  - `dashboards.created_at`, `dashboards.updated_at`
  - `widgets.created_at`, `widgets.updated_at`
- Added SQLite compatibility fallback for tests/dev legacy schemas.
- Added regression test `test_startup_migrates_legacy_tables_missing_timestamps` in `services/backend/tests/test_dashboards_api.py`.

### 18) Important: realtime window is now timestamp-based 15 minutes

- Removed fixed-count rendering (`slice(-5)`) from `services/frontend/src/components/widgets/ChartWidget.tsx`.
- Added timestamp-window filtering in `services/frontend/src/pages/FixedViewPage.tsx`:
  - realtime points are filtered to the true last 15 minutes based on point `ts_utc`.
- Added frontend regression test in `services/frontend/src/tests/fixed-view.test.tsx` to ensure old points are excluded and in-window points are preserved.

### 19) Important: datetime-local historian ranges converted to UTC before API request

- Updated `services/frontend/src/hooks/useHistorianSeries.ts` to normalize `from`/`to` values with `Date(...).toISOString()` before building query params.
- Added regression test in `services/frontend/src/tests/fixed-view.test.tsx` to assert UTC query values are sent.

### Verification evidence for latest blocker wave

- `pytest services/backend/tests tests/repo -v` ✅ (26 passed)
- `npm --prefix services/frontend run test` ✅ (24 passed)
- `docker compose up -d --build` ✅
- `npm run test:e2e` ✅ (1 passed)
- `docker compose down` ✅
