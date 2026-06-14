from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Link, User
from ..schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    LinkCreate,
    LinkOut,
    LinkUpdate,
)
from ..services.ai_service import analyze_url

router = APIRouter(prefix="/api/links", tags=["links"])


@router.get("", response_model=list[LinkOut])
def list_links(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return (
        db.query(Link)
        .filter(Link.user_id == user.id)
        .order_by(Link.created_at.desc())
        .all()
    )


@router.post("/analyze-url", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest, user: User = Depends(get_current_user)):
    """Run AI analysis on a URL without saving it (for the 'confirm/edit' step)."""
    return analyze_url(payload.url)


@router.post("", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(
    payload: LinkCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Duplicate protection: one URL per user.
    existing = (
        db.query(Link)
        .filter(Link.user_id == user.id, Link.url == payload.url)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This URL is already saved",
        )

    title = payload.title or ""
    description = payload.description or ""
    category = payload.category or ""
    tags = payload.tags or []

    needs_ai = not (title and description and category and tags)
    if payload.use_ai and needs_ai:
        ai = analyze_url(payload.url)
        title = title or ai["title"]
        description = description or ai["description"]
        category = category or ai["category"]
        tags = tags or ai["tags"]

    link = Link(
        user_id=user.id,
        url=payload.url,
        title=title or payload.url,
        description=description,
        category=category,
        tags=tags,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/{link_id}", response_model=LinkOut)
def get_link(
    link_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    link = (
        db.query(Link)
        .filter(Link.id == link_id, Link.user_id == user.id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return link


@router.put("/{link_id}", response_model=LinkOut)
def update_link(
    link_id: int,
    payload: LinkUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    link = (
        db.query(Link)
        .filter(Link.id == link_id, Link.user_id == user.id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    link = (
        db.query(Link)
        .filter(Link.id == link_id, Link.user_id == user.id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
