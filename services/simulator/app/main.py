from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.generator import SignalGenerator
from app.ws_server import stream_loop

app = FastAPI(title="SCADA Simulator")
generator = SignalGenerator.from_file("app/config/signals.json")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/stream")
async def stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await stream_loop(websocket, generator)
    except WebSocketDisconnect:
        return
