import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth, bookmarks, links, search
from .security import hash_password

logging.basicConfig(level=logging.INFO)

# Create tables on startup. For production migrations, use Alembic instead.
Base.metadata.create_all(bind=engine)


def _seed_default_user() -> None:
    db = SessionLocal()
    try:
        if db.query(User).first() is None:
            db.add(User(
                username=settings.DEFAULT_USERNAME,
                email=settings.DEFAULT_EMAIL,
                password_hash=hash_password(settings.DEFAULT_PASSWORD),
            ))
            db.commit()
            logging.info("Created default user '%s'", settings.DEFAULT_USERNAME)
    finally:
        db.close()


_seed_default_user()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])

app = FastAPI(title="AI Link Manager API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log full detail server-side, return a generic message to the client.
    logging.exception("Unhandled error on %s", request.url.path)
    # This handler runs outside CORSMiddleware, so add CORS headers manually;
    # otherwise a 500 surfaces in the browser as a misleading "CORS error".
    headers = {}
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") in settings.cors_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


app.include_router(auth.router)
app.include_router(links.router)
app.include_router(search.router)
app.include_router(bookmarks.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
