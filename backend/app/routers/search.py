from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, cast, func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Link, User
from ..schemas import LinkOut

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=list[LinkOut])
def search(
    q: Optional[str] = Query(
        None,
        description="Free-text search across title, URL, description, category and tags",
    ),
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by a single tag"),
    sort: str = Query("recent", pattern="^(recent|oldest|title)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Search the current user's links. Supports partial (substring) matching."""
    query = db.query(Link).filter(Link.user_id == user.id)

    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            or_(
                func.lower(Link.title).like(like),
                func.lower(Link.url).like(like),
                func.lower(Link.description).like(like),  # <-- description search
                func.lower(Link.category).like(like),
                # tags is JSON; cast to text for a portable substring match
                func.lower(cast(Link.tags, String)).like(like),
            )
        )

    if category:
        query = query.filter(func.lower(Link.category).like(f"%{category.lower()}%"))

    if tag:
        query = query.filter(
            func.lower(cast(Link.tags, String)).like(f"%{tag.lower()}%")
        )

    if sort == "recent":
        query = query.order_by(Link.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(Link.created_at.asc())
    else:  # title
        query = query.order_by(func.lower(Link.title).asc())

    return query.all()
