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
    BACKEND_PORT: int = 8000
    RATE_LIMIT: str = "200/minute"

    # Default seed user created on first startup (change these in .env)
    DEFAULT_USERNAME: str = "admin"
    DEFAULT_EMAIL: str = "admin@localhost"
    DEFAULT_PASSWORD: str = "changeme123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_regex(self) -> str:
        """Regex that allows any host on the same port as FRONTEND_URL.

        This means http://localhost:3000, http://192.168.x.x:3000, and
        https://your-domain.com:3000 are all accepted without listing them
        explicitly — ideal for home-server deployments with changing IPs.
        """
        from urllib.parse import urlparse
        port = urlparse(self.FRONTEND_URL).port or 3000
        return rf"https?://[^/:]+:{port}"


settings = Settings()
