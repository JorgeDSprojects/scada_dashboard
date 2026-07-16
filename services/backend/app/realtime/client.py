import json
import os

from websockets.exceptions import ConnectionClosed

try:
    from websockets.asyncio.client import connect
except ImportError:
    from websockets.client import connect


class RealtimeClient:
    def __init__(self, stream_url: str | None = None):
        self._stream_url = stream_url or os.getenv(
            "SIMULATOR_STREAM_URL", "ws://simulator:8765/stream"
        )
        self._connection = None

    async def next_event(self) -> dict[str, object]:
        while True:
            if self._connection is None:
                self._connection = await connect(self._stream_url)

            try:
                raw_message = await self._connection.recv()
            except ConnectionClosed:
                self._connection = None
                continue

            payload = self._parse_message(raw_message)
            if payload is not None:
                return payload

    @staticmethod
    def _parse_message(raw_message: str | bytes) -> dict[str, object] | None:
        if isinstance(raw_message, bytes):
            raw_message = raw_message.decode("utf-8")

        parsed = json.loads(raw_message)
        if not isinstance(parsed, dict):
            return None

        return parsed
