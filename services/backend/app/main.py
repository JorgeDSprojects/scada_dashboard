from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.api import dashboards, historian, widgets
from app.db import Base, SessionLocal, engine, run_startup_compat_migrations
from app.historian.seed import seed_if_empty
from app.realtime.manager import RealtimeManager

app = FastAPI(title="SCADA Backend")
manager = RealtimeManager()


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    run_startup_compat_migrations()
    with SessionLocal() as session:
        seed_if_empty(session)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/realtime")
async def realtime_ws(websocket: WebSocket, dashboard_id: int) -> None:
    await websocket.accept()
    try:
        while True:
            event = await manager.next_event(dashboard_id)
            await websocket.send_json(event)
    except WebSocketDisconnect:
        return


app.include_router(dashboards.router)
app.include_router(historian.router)
app.include_router(widgets.router)
