# AI Link Manager — Frontend (Shelf)

React + Vite + TypeScript + Tailwind single-page app for the AI Link Manager.
Design identity: a personal library card-catalog — links render as index cards
with monospace metadata and a category "stamp".

## Tech
- React 18 + Vite + TypeScript
- React Router for navigation
- Tailwind CSS with custom design tokens
- lucide-react icons
- Plain `fetch` API client with JWT auth (token in localStorage)

## Pages
- `/login`, `/register` — auth
- `/` — dashboard: stats, search, category/tag facets, link grid
- `/add` — add a link (analyze URL with AI → review → save)
- `/edit/:id` — edit or delete a link
- `/import` — import Brave bookmarks HTML

## Run locally
```bash
cd frontend
npm install
cp .env.example .env     # set VITE_API_URL if backend isn't on :5000
npm run dev              # http://localhost:3000
```

## Build
```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

## Configuration
`VITE_API_URL` (default `http://localhost:5000`) points at the backend. It is
**baked in at build time**, so when building the Docker image pass it as a
build arg (the root `docker-compose.yml` already does this).

## Docker
The Dockerfile builds the app and serves the static output with nginx on port
3000 (SPA fallback configured in `nginx.conf`).
