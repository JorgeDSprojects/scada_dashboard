from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.historian.query import query_series
from app.historian.seed import list_signal_names, seed_if_empty

router = APIRouter(tags=["historian"])


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


@router.get("/api/historian/signals", response_model=list[str])
def get_historian_signals() -> list[str]:
    return list_signal_names()


@router.get("/api/historian/series")
def get_historian_series(
    signals: str,
    from_: datetime = Query(alias="from"),
    to: datetime = Query(alias="to"),
    bucket: str = "1m",
    db: Session = Depends(get_db),
) -> dict[str, object]:
    signal_list = [value.strip() for value in signals.split(",") if value.strip()]
    if not signal_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one signal is required",
        )

    known_signals = set(list_signal_names())
    unknown = sorted(signal for signal in signal_list if signal not in known_signals)
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown signals: {', '.join(unknown)}",
        )

    from_utc = _normalize_utc(from_)
    to_utc = _normalize_utc(to)
    if from_utc >= to_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' must be before 'to'",
        )

    seed_if_empty(db)
    try:
        return query_series(db, signal_list, from_utc, to_utc, bucket)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
