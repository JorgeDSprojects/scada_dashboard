from sqlalchemy.orm import Session

from app import models, schemas


def create_widget(
    db: Session,
    dashboard_id: int,
    payload: schemas.WidgetCreate,
) -> models.Widget:
    widget = models.Widget(
        dashboard_id=dashboard_id,
        name=payload.name,
        widget_type=payload.widget_type,
        settings=payload.settings,
    )
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return widget


def get_widget(db: Session, widget_id: int) -> models.Widget | None:
    return db.get(models.Widget, widget_id)


def update_widget(
    db: Session,
    widget: models.Widget,
    payload: schemas.WidgetUpdate,
) -> models.Widget:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(widget, field, value)

    db.add(widget)
    db.commit()
    db.refresh(widget)
    return widget


def delete_widget(db: Session, widget: models.Widget) -> None:
    db.delete(widget)
    db.commit()
