import os

# Configure a throwaway SQLite DB and no AI key BEFORE importing the app.
os.environ["DATABASE_URL"] = "sqlite:///./test_linkmanager.db"
os.environ["AI_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

# Remove any leftover test DB so each run starts clean.
if os.path.exists("./test_linkmanager.db"):
    os.remove("./test_linkmanager.db")

from app.main import app  # noqa: E402

client = TestClient(app)


def _register_and_login(username, email, password="supersecret"):
    client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    resp = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_login_and_crud():
    headers = _register_and_login("alice", "alice@example.com")

    # Create a link with explicit fields (use_ai=False -> no network needed).
    create = client.post(
        "/api/links",
        headers=headers,
        json={
            "url": "https://example.com/deep-learning",
            "title": "Intro to Deep Learning",
            "description": "A friendly overview of neural networks and backprop.",
            "category": "AI",
            "tags": ["machine-learning", "neural-networks"],
            "use_ai": False,
        },
    )
    assert create.status_code == 201, create.text
    link_id = create.json()["id"]

    # Duplicate URL is rejected.
    dup = client.post(
        "/api/links",
        headers=headers,
        json={"url": "https://example.com/deep-learning", "use_ai": False},
    )
    assert dup.status_code == 409

    # Update.
    upd = client.put(
        f"/api/links/{link_id}",
        headers=headers,
        json={"category": "Machine Learning"},
    )
    assert upd.json()["category"] == "Machine Learning"

    # Delete.
    assert client.delete(f"/api/links/{link_id}", headers=headers).status_code == 204
    assert client.get(f"/api/links/{link_id}", headers=headers).status_code == 404


def test_search_by_description():
    headers = _register_and_login("bob", "bob@example.com")
    client.post(
        "/api/links",
        headers=headers,
        json={
            "url": "https://example.com/article",
            "title": "Some Title",
            "description": "An article all about cybersecurity best practices.",
            "category": "Security",
            "tags": ["infosec"],
            "use_ai": False,
        },
    )

    # The query word only appears in the DESCRIPTION, not the title.
    results = client.get("/api/search?q=cybersecurity", headers=headers).json()
    assert len(results) == 1
    assert results[0]["title"] == "Some Title"


def test_user_isolation():
    h1 = _register_and_login("carol", "carol@example.com")
    h2 = _register_and_login("dave", "dave@example.com")
    client.post(
        "/api/links",
        headers=h1,
        json={"url": "https://carol.example.com", "title": "Carol", "use_ai": False},
    )
    # Dave should see none of Carol's links.
    assert client.get("/api/links", headers=h2).json() == []


def test_auth_required():
    assert client.get("/api/links").status_code in (401, 403)


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
