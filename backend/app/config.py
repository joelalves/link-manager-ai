import secrets

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# A fixed, checked-in default here would be identical across every
# deployment of this repo and thus a known, forgeable JWT signing key —
# see the model_validator below for how this is enforced.
_WEAK_JWT_SECRETS = {
    "",
    "change_this_secret",
    "secret",
    "changeme",
    "change_me",
    "your_secret_here",
    "supersecret",
    "password",
    "changethis",
}
_MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    # Database (defaults to local SQLite so the app runs with zero config)
    DATABASE_URL: str = "sqlite:///./linkmanager.db"

    # Auth
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # AI integration (OpenAI-compatible chat completions API)
    AI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4.1-mini"
    AI_BASE_URL: str = "https://api.openai.com/v1"
    AI_MAX_CONTENT_CHARS: int = 6000
    AI_TIMEOUT_SECONDS: float = 30.0

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_PORT: int = 8000
    RATE_LIMIT: str = "200/minute"

    # Default seed user created on first startup (change these in .env)
    DEFAULT_USERNAME: str = "admin"
    DEFAULT_EMAIL: str = "admin@localhost"
    DEFAULT_PASSWORD: str = "changeme123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Port the frontend container listens on. Allows any hostname on this port.
    FRONTEND_PORT: int = 3000

    @property
    def cors_origin_regex(self) -> str:
        return rf"https?://[^/:]+:{self.FRONTEND_PORT}"

    @model_validator(mode="after")
    def _ensure_strong_jwt_secret(self) -> "Settings":
        secret = self.JWT_SECRET
        if not secret:
            # No secret configured: fine for zero-config local dev, but a
            # fixed fallback string would be a known key in every
            # deployment, so generate a fresh random one per process
            # instead. Sessions won't survive a restart — acceptable for
            # dev; production must set a real JWT_SECRET (see below).
            self.JWT_SECRET = secrets.token_urlsafe(48)
            return self
        if secret.lower() in _WEAK_JWT_SECRETS or len(secret) < _MIN_JWT_SECRET_LENGTH:
            raise ValueError(
                "JWT_SECRET is missing or too weak (must be a random string "
                "of at least 32 characters). Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))" '
                "and set it in your .env file."
            )
        return self

settings = Settings()
