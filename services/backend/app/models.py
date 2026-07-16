from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pipeline: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )
    widgets: Mapped[list["Widget"]] = relationship(
        back_populates="dashboard", cascade="all, delete-orphan"
    )


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dashboard_id: Mapped[int] = mapped_column(ForeignKey("dashboards.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    widget_type: Mapped[str] = mapped_column(String(100), nullable=False)
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, onupdate=_utc_now, nullable=False
    )

    dashboard: Mapped[Dashboard] = relationship(back_populates="widgets")


class HistorianSample(Base):
    __tablename__ = "historian_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    signal_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    ts_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
