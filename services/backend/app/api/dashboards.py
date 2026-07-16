from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import dashboards as dashboards_repo
from app.repositories import widgets as widgets_repo
from app.schemas import (
    DashboardCreate,
    DashboardRead,
    DashboardUpdate,
    WidgetCreate,
    WidgetRead,
)
from app.validators import validate_widget_configuration

router = APIRouter(tags=["dashboards"])


@router.get("/api/dashboards", response_model=list[DashboardRead])
def list_dashboards(db: Session = Depends(get_db)) -> list[DashboardRead]:
    return dashboards_repo.list_dashboards(db)


@router.post(
    "/api/dashboards",
    response_model=DashboardRead,
    status_code=status.HTTP_201_CREATED,
)
def create_dashboard(
    payload: DashboardCreate,
    db: Session = Depends(get_db),
) -> DashboardRead:
    return dashboards_repo.create_dashboard(db, payload)


@router.get("/api/dashboards/{dashboard_id}", response_model=DashboardRead)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db)) -> DashboardRead:
    dashboard = dashboards_repo.get_dashboard(db, dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    return dashboard


@router.put("/api/dashboards/{dashboard_id}", response_model=DashboardRead)
def update_dashboard(
    dashboard_id: int,
    payload: DashboardUpdate,
    db: Session = Depends(get_db),
) -> DashboardRead:
    dashboard = dashboards_repo.get_dashboard(db, dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
    return dashboards_repo.update_dashboard(db, dashboard, payload)


@router.delete("/api/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db)) -> Response:
    dashboard = dashboards_repo.get_dashboard(db, dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    dashboards_repo.delete_dashboard(db, dashboard)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/api/dashboards/{dashboard_id}/widgets",
    response_model=WidgetRead,
    status_code=status.HTTP_201_CREATED,
)
def create_widget(
    dashboard_id: int,
    payload: WidgetCreate,
    db: Session = Depends(get_db),
) -> WidgetRead:
    dashboard = dashboards_repo.get_dashboard(db, dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    try:
        validate_widget_configuration(
            dashboard_pipeline=dashboard.pipeline,
            widget_type=payload.widget_type,
            settings=payload.settings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return widgets_repo.create_widget(db, dashboard.id, payload)
