from fastapi import FastAPI

from app.api import dashboards, widgets
from app.db import Base, engine

app = FastAPI(title="SCADA Backend")


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(dashboards.router)
app.include_router(widgets.router)
