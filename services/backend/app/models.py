from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pipeline: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
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

    dashboard: Mapped[Dashboard] = relationship(back_populates="widgets")
