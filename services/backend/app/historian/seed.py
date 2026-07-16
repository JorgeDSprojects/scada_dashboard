import argparse
import json
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.db import Base, SessionLocal, engine

DEFAULT_SIGNAL_CATALOG: list[dict[str, Any]] = [
    {"name": "Gen_RPM", "min": 0, "max": 2000, "frequency_seconds": 0.5},
    {"name": "hydrolic_temp", "min": -15, "max": 60, "frequency_seconds": 1},
    {"name": "Gear_oil_temp", "min": -20, "max": 40, "frequency_seconds": 1},
    {"name": "Blades_PitchAngle", "min": 0, "max": 360, "frequency_seconds": 2},
    {"name": "Windspeed", "min": 0, "max": 50, "frequency_seconds": 1},
    {"name": "Prod_pwr", "min": 0, "max": 500, "frequency_seconds": 5},
]


def _catalog_candidates() -> list[Path]:
    env_path = os.getenv("SIGNALS_CATALOG_PATH")
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))

    repo_root = Path(__file__).resolve().parents[4]
    candidates.append(repo_root / "services" / "simulator" / "app" / "config" / "signals.json")
    return candidates


def load_signal_catalog() -> list[dict[str, Any]]:
    for candidate in _catalog_candidates():
        if not candidate.exists():
            continue

        payload = json.loads(candidate.read_text(encoding="utf-8"))
        return list(payload.get("signals", []))

    return DEFAULT_SIGNAL_CATALOG


def list_signal_names() -> list[str]:
    return [str(signal["name"]) for signal in load_signal_catalog()]


def _seed_range() -> tuple[datetime, datetime]:
    seed_days = float(os.getenv("HISTORIAN_SEED_DAYS", "4"))
    now_utc = datetime.now(timezone.utc).replace(second=0, microsecond=0)

    if seed_days.is_integer():
        start_date = (now_utc - timedelta(days=int(seed_days))).date()
        start_utc = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    else:
        start_utc = now_utc - timedelta(days=seed_days)

    end_utc = now_utc
    return start_utc, end_utc


def _sample_interval_seconds(signal: dict[str, Any], session: Session) -> float:
    default_floor = "60"
    if session.bind is not None and session.bind.dialect.name == "sqlite":
        default_floor = "300"

    minimum_sample_seconds = float(os.getenv("HISTORIAN_MIN_SAMPLE_SECONDS", default_floor))
    return max(float(signal["frequency_seconds"]), minimum_sample_seconds)


def seed_all_signals(session: Session) -> None:
    start_utc, end_utc = _seed_range()
    insert_stmt = text(
        """
        insert into historian_samples (signal_name, ts_utc, value)
        values (:signal_name, :ts_utc, :value)
        """
    )

    batch: list[dict[str, Any]] = []
    for signal in load_signal_catalog():
        current = start_utc
        interval_seconds = _sample_interval_seconds(signal, session)
        interval = timedelta(seconds=interval_seconds)

        while current <= end_utc:
            batch.append(
                {
                    "signal_name": signal["name"],
                    "ts_utc": current,
                    "value": round(
                        random.uniform(float(signal["min"]), float(signal["max"])),
                        3,
                    ),
                }
            )
            if len(batch) >= 5000:
                session.execute(insert_stmt, batch)
                batch.clear()
            current += interval

    if batch:
        session.execute(insert_stmt, batch)

    session.commit()


def seed_if_empty(session: Session) -> None:
    if not session.execute(text("select 1 from historian_samples limit 1")).first():
        seed_all_signals(session)


def reset_and_seed(session: Session) -> None:
    if session.bind is not None and session.bind.dialect.name == "sqlite":
        session.execute(text("delete from historian_samples"))
    else:
        session.execute(text("truncate table historian_samples"))
    session.commit()
    seed_all_signals(session)


def main() -> None:
    parser = argparse.ArgumentParser(description="Historian seed utility")
    parser.add_argument("--reset", action="store_true", help="Reset historian data before seeding")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        if args.reset:
            reset_and_seed(session)
        else:
            seed_if_empty(session)


if __name__ == "__main__":
    main()
