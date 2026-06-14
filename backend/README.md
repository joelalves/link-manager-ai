# AI Link Manager — Backend (FastAPI)

REST API for saving links/articles, AI-powered URL analysis, Brave bookmark
import, and search.

## Tech
- FastAPI + Uvicorn
- SQLAlchemy 2.0 (PostgreSQL in production, SQLite for local dev)
- JWT auth (PyJWT) + bcrypt password hashing
- httpx + BeautifulSoup for page fetching / parsing
- slowapi for rate limiting
- OpenAI-compatible chat completions API for AI analysis

## Run locally (SQLite, no Docker)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit values
# For local dev, set DATABASE_URL=sqlite:///./linkmanager.db in .env
uvicorn app.main:app --reload --port 5000
```
Interactive API docs: http://localhost:5000/docs

## Run tests
```bash
pytest
```

## Environment variables
See `.env.example`. The AI key is **only** read server-side from
`AI_API_KEY` and is never sent to the client. If no key is set, URL analysis
falls back to page `<title>` / meta description so the app still works.

## API endpoints
All `/api/links`, `/api/search`, and `/api/bookmarks` routes require
`Authorization: Bearer <token>`. Users can only access their own links.

| Method | Path                     | Purpose                                  |
|--------|--------------------------|------------------------------------------|
| POST   | /api/auth/register       | Create account                           |
| POST   | /api/auth/login          | Get JWT token                            |
| GET    | /api/links               | List your links                          |
| POST   | /api/links               | Save a link (AI fills missing fields)    |
| GET    | /api/links/{id}          | Get one link                             |
| PUT    | /api/links/{id}          | Edit a link                              |
| DELETE | /api/links/{id}          | Delete a link                            |
| POST   | /api/links/analyze-url   | AI-analyze a URL without saving          |
| POST   | /api/bookmarks/import    | Import Brave bookmarks HTML (multipart)  |
| GET    | /api/search              | Search links                             |
| GET    | /api/health              | Health check                             |

### Search
`GET /api/search` supports:
- `q` — free-text, partial match across **title, URL, description, category, and tags**
- `category` — filter by category
- `tag` — filter by a single tag
- `sort` — `recent` (default) | `oldest` | `title`

Examples:
```text
GET /api/search?q=cybersecurity      # matches title, description, tags, etc.
GET /api/search?category=AI
GET /api/search?tag=productivity
```

### Save a link
```json
POST /api/links
{
  "url": "https://example.com/article",
  "use_ai": true
}
```
With `use_ai: true`, any field you leave blank is filled by the AI analyzer.
Send explicit `title`/`description`/`category`/`tags` to override. Saving a
URL you already saved returns `409` (duplicate protection).

## Notes
- `Base.metadata.create_all` builds tables on startup. For real deployments,
  switch to Alembic migrations.
- `tags` is stored as JSON for portability between Postgres and SQLite.
