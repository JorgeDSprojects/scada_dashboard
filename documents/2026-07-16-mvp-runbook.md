# SCADA Dashboard MVP Runbook

## 1) Prerequisites

- Docker Engine + Docker Compose v2
- Python 3.12 with `pytest`
- Node.js 20+
- Create a local `.env` from `.env.example` and ensure backend DB vars are present:

```bash
DB_HOST=postgres
DB_PORT=5432
DB_NAME=scada
DB_USER=scada
DB_PASSWORD=scada
```

- Keep DB vars aligned with PostgreSQL credentials (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`) when customizing values.
- Root dependencies installed:

```bash
npm install
```

- Playwright browsers installed:

```bash
npx playwright install chromium
```

## 2) Start stack

Build and start all services in detached mode:

```bash
./scripts/up.sh --build --detach
```

If startup readiness times out, verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env` before retrying.

Check service and HTTP status:

```bash
./scripts/status.sh
```

## 3) Reset stack

Reset historian data, rebuild, and restart detached:

```bash
./scripts/up.sh --reset --build --detach
```

## 4) Run tests

Run simulator tests:

```bash
pytest services/simulator/tests -v
```

Run backend and repository contract tests:

```bash
pytest services/backend/tests tests/repo -v
```

Run frontend unit tests:

```bash
npm --prefix services/frontend run test
```

Run e2e smoke test:

```bash
npx playwright test tests/e2e/scada-smoke.spec.ts
```

## 5) Smoke scenario validated by e2e

The smoke test validates this full lifecycle:

1. Create dashboard from the main page (`New dashboard` button)
2. Add widget from editor
3. Publish dashboard
4. Open fixed view (`/dashboards/:id`; legacy `/fixed/:id` remains compatible)
5. Delete dashboard from main list
