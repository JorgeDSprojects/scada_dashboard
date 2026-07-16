import asyncio
from contextlib import suppress
from threading import Lock

from app.realtime.client import RealtimeClient


class RealtimeManager:
    def __init__(self, client: RealtimeClient | None = None):
        self._client = client or RealtimeClient()
        self._subscribers: dict[asyncio.Task[object], asyncio.Queue[dict[str, object]]] = {}
        self._reader_task: asyncio.Task[None] | None = None
        self._state_lock = Lock()

    async def next_event(self, dashboard_id: int) -> dict[str, object]:
        _ = dashboard_id
        queue = self._get_or_create_subscriber_queue()
        self._ensure_reader_running()
        return await queue.get()

    async def aclose(self) -> None:
        with self._state_lock:
            reader_task = self._reader_task
            self._reader_task = None
            self._subscribers.clear()

        if reader_task is not None:
            reader_task.cancel()
            with suppress(asyncio.CancelledError):
                await reader_task

    def _get_or_create_subscriber_queue(self) -> asyncio.Queue[dict[str, object]]:
        task = asyncio.current_task()
        if task is None:
            raise RuntimeError("RealtimeManager.next_event must run inside an asyncio task")

        with self._state_lock:
            queue = self._subscribers.get(task)
            if queue is not None:
                return queue

            queue = asyncio.Queue[dict[str, object]]()
            self._subscribers[task] = queue
            task.add_done_callback(self._remove_subscriber)
            return queue

    def _remove_subscriber(self, task: asyncio.Task[object]) -> None:
        reader_task: asyncio.Task[None] | None = None
        with self._state_lock:
            self._subscribers.pop(task, None)
            if not self._subscribers and self._reader_task is not None:
                reader_task = self._reader_task
                self._reader_task = None

        if reader_task is not None:
            reader_task.cancel()

    def _ensure_reader_running(self) -> None:
        with self._state_lock:
            if self._reader_task is not None and not self._reader_task.done():
                return

            self._reader_task = asyncio.create_task(self._read_and_broadcast())

    async def _read_and_broadcast(self) -> None:
        while True:
            try:
                event = await self._client.next_event()
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(0.1)
                continue

            self._broadcast(event)

    def _broadcast(self, event: dict[str, object]) -> None:
        with self._state_lock:
            subscribers = list(self._subscribers.values())

        for queue in subscribers:
            queue.put_nowait(event)
