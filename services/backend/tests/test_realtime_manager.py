import asyncio
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.realtime.manager import RealtimeManager


class GuardedQueueClient:
    def __init__(self) -> None:
        self._events: asyncio.Queue[dict[str, object]] = asyncio.Queue()
        self._active_calls = 0
        self.max_active_calls = 0

    async def next_event(self) -> dict[str, object]:
        self._active_calls += 1
        self.max_active_calls = max(self.max_active_calls, self._active_calls)
        try:
            return await self._events.get()
        finally:
            self._active_calls -= 1

    def publish(self, event: dict[str, object]) -> None:
        self._events.put_nowait(event)


async def _wait_until(predicate, *, timeout: float = 1.0) -> None:
    start = asyncio.get_running_loop().time()
    while True:
        if predicate():
            return
        if asyncio.get_running_loop().time() - start > timeout:
            raise TimeoutError("Condition was not met before timeout")
        await asyncio.sleep(0)


def test_manager_fanout_delivers_same_event_to_all_subscribers() -> None:
    async def scenario() -> None:
        client = GuardedQueueClient()
        manager = RealtimeManager(client=client)
        event = {"signal": "Gen_RPM", "value": 1.0, "ts_utc": "2026-01-01T00:00:00Z"}

        first_subscriber = asyncio.create_task(manager.next_event(dashboard_id=1))
        second_subscriber = asyncio.create_task(manager.next_event(dashboard_id=2))
        await _wait_until(lambda: client.max_active_calls == 1)

        client.publish(event)

        first_result, second_result = await asyncio.gather(
            asyncio.wait_for(first_subscriber, timeout=1),
            asyncio.wait_for(second_subscriber, timeout=1),
        )
        assert first_result == event
        assert second_result == event

        await manager.aclose()

    asyncio.run(scenario())


def test_manager_never_performs_concurrent_upstream_recv() -> None:
    async def scenario() -> None:
        client = GuardedQueueClient()
        manager = RealtimeManager(client=client)
        event = {"signal": "Gen_RPM", "value": 2.0, "ts_utc": "2026-01-01T00:01:00Z"}

        first_subscriber = asyncio.create_task(manager.next_event(dashboard_id=1))
        second_subscriber = asyncio.create_task(manager.next_event(dashboard_id=2))
        await _wait_until(lambda: client.max_active_calls == 1)

        assert client.max_active_calls == 1

        client.publish(event)
        await asyncio.wait_for(first_subscriber, timeout=1)
        await asyncio.wait_for(second_subscriber, timeout=1)

        await manager.aclose()

    asyncio.run(scenario())
