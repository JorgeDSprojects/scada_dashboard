# SCADA Dashboard MVP Runbook

## 1) Prerequisites

- Docker Engine + Docker Compose v2
- Python 3.12 with `pytest`
- Node.js 20+
- Playwright browsers installed for the e2e workspace:

```bash
npx --prefix tests/e2e playwright install chromium
```

## 2) Start stack

Build and start all services in detached mode:

```bash
./scripts/up.sh --build --detach
```

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
npx --prefix tests/e2e playwright test --config tests/e2e/playwright.config.ts tests/e2e/scada-smoke.spec.ts
```

## 5) Smoke scenario validated by e2e

The smoke test validates this full lifecycle:

1. Create dashboard
2. Add widget from editor
3. Publish dashboard
4. Open fixed view
5. Delete dashboard from main list
