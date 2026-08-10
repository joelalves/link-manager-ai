import logging
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.datastructures import MutableHeaders

# This is a JSON API, not a document host, so the default policy locks
# everything down; only the interactive docs pages need real CSP directives.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
_DOCS_CSP = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "connect-src 'self'"
)


class SecurityHeadersMiddleware:
    """Adds baseline security headers to every response, including errors
    and 404s, since those bypass route-level dependencies."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                path = scope.get("path", "")
                is_docs = path.startswith(("/docs", "/redoc"))
                headers["Content-Security-Policy"] = _DOCS_CSP if is_docs else _API_CSP
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["Permissions-Policy"] = (
                    "geolocation=(), camera=(), microphone=(), payment=(), usb=()"
                )
                headers["Cross-Origin-Opener-Policy"] = "same-origin"
                headers["Cross-Origin-Resource-Policy"] = "same-origin"
            await send(message)

        await self.app(scope, receive, send_wrapper)

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth, bookmarks, links, notes, search
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
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Added last so it wraps outermost and stamps headers on every response,
# including CORS preflights, rate-limit 429s, and the 500 handler below.
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log full detail server-side, return a generic message to the client.
    logging.exception("Unhandled error on %s", request.url.path)
    # This handler runs outside CORSMiddleware, so add CORS headers manually;
    # otherwise a 500 surfaces in the browser as a misleading "CORS error".
    headers = {}
    origin = request.headers.get("origin")
    if origin and re.fullmatch(settings.cors_origin_regex, origin.rstrip("/")):
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
app.include_router(notes.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
