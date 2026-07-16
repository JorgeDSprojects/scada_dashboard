from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WidgetBase(BaseModel):
    name: str
    widget_type: str
    settings: dict[str, object] = Field(default_factory=dict)


class WidgetCreate(WidgetBase):
    pass


class WidgetUpdate(BaseModel):
    name: str | None = None
    widget_type: str | None = None
    settings: dict[str, object] | None = None


class WidgetRead(WidgetBase):
    id: int
    dashboard_id: int

    model_config = ConfigDict(from_attributes=True)


class DashboardBase(BaseModel):
    name: str
    description: str | None = None
    pipeline: Literal["realtime", "historian"]
    status: Literal["draft", "published"]


class DashboardCreate(DashboardBase):
    pass


class DashboardUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    pipeline: Literal["realtime", "historian"] | None = None
    status: Literal["draft", "published"] | None = None


class DashboardRead(DashboardBase):
    id: int
    widgets: list[WidgetRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
