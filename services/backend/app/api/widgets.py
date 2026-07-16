from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import dashboards as dashboards_repo
from app.repositories import widgets as widgets_repo
from app.schemas import WidgetRead, WidgetUpdate
from app.validators import validate_widget_configuration

router = APIRouter(tags=["widgets"])


@router.put("/api/widgets/{widget_id}", response_model=WidgetRead)
def update_widget(
    widget_id: int,
    payload: WidgetUpdate,
    db: Session = Depends(get_db),
) -> WidgetRead:
    widget = widgets_repo.get_widget(db, widget_id)
    if widget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")

    dashboard = dashboards_repo.get_dashboard(db, widget.dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    effective_widget_type = payload.widget_type if payload.widget_type is not None else widget.widget_type
    effective_settings = payload.settings if payload.settings is not None else widget.settings

    try:
        validate_widget_configuration(
            dashboard_pipeline=dashboard.pipeline,
            widget_type=effective_widget_type,
            settings=effective_settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return widgets_repo.update_widget(db, widget, payload)


@router.delete("/api/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget(widget_id: int, db: Session = Depends(get_db)) -> Response:
    widget = widgets_repo.get_widget(db, widget_id)
    if widget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")

    widgets_repo.delete_widget(db, widget)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
