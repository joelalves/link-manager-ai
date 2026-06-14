from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Link, User
from ..services.ai_service import analyze_url
from ..services.bookmark_service import parse_bookmarks

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.post("/import")
def import_bookmarks(
    file: UploadFile = File(...),
    use_ai: bool = Query(
        False, description="Run AI analysis per bookmark (slower, costs tokens)"
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Import an exported Brave (Netscape format) bookmarks HTML file."""
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    bookmarks = parse_bookmarks(raw.decode("utf-8", errors="ignore"))

    imported, skipped = 0, 0
    for bm in bookmarks:
        exists = (
            db.query(Link)
            .filter(Link.user_id == user.id, Link.url == bm["url"])
            .first()
        )
        if exists:
            skipped += 1
            continue

        title = bm["title"]
        description, category, tags = "", "", []
        if use_ai:
            ai = analyze_url(bm["url"])
            title = title or ai["title"]
            description = ai["description"]
            category = ai["category"]
            tags = ai["tags"]

        db.add(
            Link(
                user_id=user.id,
                url=bm["url"],
                title=title or bm["url"],
                description=description,
                category=category,
                tags=tags,
            )
        )
        imported += 1

    db.commit()
    return {
        "total_found": len(bookmarks),
        "imported": imported,
        "skipped_duplicates": skipped,
    }
