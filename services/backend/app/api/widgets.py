from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import widgets as widgets_repo
from app.schemas import WidgetRead, WidgetUpdate

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
    return widgets_repo.update_widget(db, widget, payload)


@router.delete("/api/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget(widget_id: int, db: Session = Depends(get_db)) -> Response:
    widget = widgets_repo.get_widget(db, widget_id)
    if widget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")

    widgets_repo.delete_widget(db, widget)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
