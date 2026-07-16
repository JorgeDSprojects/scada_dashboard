from app.realtime.client import RealtimeClient


class RealtimeManager:
    def __init__(self, client: RealtimeClient | None = None):
        self._client = client or RealtimeClient()

    async def next_event(self, dashboard_id: int) -> dict[str, object]:
        _ = dashboard_id
        return await self._client.next_event()
