from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Note, User
from ..schemas import NoteOut, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _get_or_create(db: Session, user: User) -> Note:
    note = db.query(Note).filter(Note.user_id == user.id).first()
    if note is None:
        note = Note(user_id=user.id, content="")
        db.add(note)
        db.commit()
        db.refresh(note)
    return note


@router.get("", response_model=NoteOut)
def get_note(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_or_create(db, user)


@router.put("", response_model=NoteOut)
def update_note(
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = _get_or_create(db, user)
    note.content = payload.content
    db.commit()
    db.refresh(note)
    return note
