from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database (defaults to local SQLite so the app runs with zero config)
    DATABASE_URL: str = "sqlite:///./linkmanager.db"

    # Auth
    JWT_SECRET: str = "change_this_secret"
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
    # Optional extra origins allowed by CORS (comma-separated).
    CORS_ORIGINS: str = ""
    BACKEND_PORT: int = 8000
    RATE_LIMIT: str = "200/minute"

    # Default seed user created on first startup (change these in .env)
    DEFAULT_USERNAME: str = "admin"
    DEFAULT_EMAIL: str = "admin@localhost"
    DEFAULT_PASSWORD: str = "changeme123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        """Allowed CORS origins.

        Always includes localhost + 127.0.0.1 on :3000 for local dev, plus
        FRONTEND_URL and anything in CORS_ORIGINS. Trailing slashes are
        stripped and duplicates removed so small .env mistakes don't break
        the preflight.
        """
        candidates = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            self.FRONTEND_URL,
            *self.CORS_ORIGINS.split(","),
        ]
        origins: list[str] = []
        for origin in candidates:
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
        return origins


settings = Settings()
