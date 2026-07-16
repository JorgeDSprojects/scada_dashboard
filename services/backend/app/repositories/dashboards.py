from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas


def list_dashboards(db: Session) -> list[models.Dashboard]:
    return list(db.scalars(select(models.Dashboard)).all())


def create_dashboard(db: Session, payload: schemas.DashboardCreate) -> models.Dashboard:
    dashboard = models.Dashboard(
        name=payload.name,
        description=payload.description,
        pipeline=payload.pipeline,
        status=payload.status,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return dashboard


def get_dashboard(db: Session, dashboard_id: int) -> models.Dashboard | None:
    return db.get(models.Dashboard, dashboard_id)


def update_dashboard(
    db: Session,
    dashboard: models.Dashboard,
    payload: schemas.DashboardUpdate,
) -> models.Dashboard:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dashboard, field, value)

    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return dashboard


def delete_dashboard(db: Session, dashboard: models.Dashboard) -> None:
    db.delete(dashboard)
    db.commit()
