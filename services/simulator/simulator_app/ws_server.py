import asyncio
from datetime import datetime, timezone

from simulator_app.generator import SignalGenerator


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def stream_loop(websocket, generator: SignalGenerator):
    loop = asyncio.get_running_loop()
    last_emitted: dict[str, float] = {name: 0.0 for name in generator.spec}

    while True:
        current = loop.time()
        for signal_name, cfg in generator.spec.items():
            frequency = float(cfg["frequency_seconds"])
            if current - last_emitted[signal_name] < frequency:
                continue

            await websocket.send_json(
                {
                    "signal": signal_name,
                    "value": generator.next_value(signal_name),
                    "ts_utc": utc_timestamp(),
                }
            )
            last_emitted[signal_name] = current

        await asyncio.sleep(0.05)
