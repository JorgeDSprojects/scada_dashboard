# SCADA MVP Manual Validation Report

Date: 2026-07-16
Environment: local Docker Compose

## 1. Objective

This document records the manual and operational validation status for the SCADA MVP after merge to `main`.

## 2. Services and Runtime Validation

### 2.1 Stack startup

Command used:

```bash
./scripts/up.sh --build --detach
```

Result:
- Images built successfully (`frontend`, `backend`, `simulator`).
- Containers started successfully (`frontend`, `backend`, `simulator`, `postgres`).
- Readiness probes passed (`frontend` HTTP and backend API via frontend proxy).

### 2.2 Service status

Command used:

```bash
docker compose ps
```

Result:
- `scada_dashboard-frontend-1`: Up, exposed on `localhost:5173`
- `scada_dashboard-backend-1`: Up
- `scada_dashboard-simulator-1`: Up
- `scada_dashboard-postgres-1`: Up

## 3. Automated Smoke Validation

Command used:

```bash
npm run test:e2e
```

Result:
- Playwright smoke test passed (`1 passed`).
- Lifecycle covered by smoke:
  1. Create dashboard
  2. Add widget from editor
  3. Publish dashboard
  4. Open dashboard fixed view
  5. Delete dashboard

## 4. Recommended Manual UI Checklist

Open `http://localhost:5173` and validate the following:

1. Main page
   - Dashboard table renders with columns: Name, Description, Pipeline, Status, Actions.
   - Existing dashboards can be opened, edited, and deleted.

2. Editor page (`/editor/:id`)
   - `name` and `description` inputs are editable.
   - Pipeline and chart type selectors work.
   - Signal + color selection allows adding multiple signals.
   - Historian widgets require `from/to` range before launch.
   - Widget can be launched and displayed in grid.
   - `Save draft` and `Publish dashboard` update dashboard status.

3. Fixed view (`/dashboards/:id`)
   - Published realtime dashboards show live updates.
   - Realtime connection status is visible.
   - Historian widgets load data per widget range.
   - Missing or invalid historian ranges show widget-scoped feedback.

4. Delete flow
   - Delete confirmation appears from main table.
   - Dashboard is removed from table after confirmation.

## 5. Current Status Summary

- Docker stack: PASS
- Service readiness probes: PASS
- E2E smoke test: PASS
- Manual UI validation: READY TO EXECUTE using the checklist above

## 6. Notes

- Frontend endpoint: `http://localhost:5173`
- To stop stack:

```bash
./scripts/down.sh
```
