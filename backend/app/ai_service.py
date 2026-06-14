"""AI URL analysis service.

Fetches a page, sends its readable content to an OpenAI-compatible chat
completions endpoint, and returns validated structured metadata. All network
and parsing failures degrade gracefully to a metadata-only fallback so the
rest of the app keeps working even without an API key.
"""

import json
import logging
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from ..config import settings

logger = logging.getLogger("ai_service")

DEFAULT_CATEGORY = "Uncategorized"
MAX_TAGS = 8

PROMPT_TEMPLATE = """Analyze the following webpage information and extract structured metadata.

Return only valid JSON with the following fields:
- title
- description
- category
- tags

Rules:
- The title should be clear and concise.
- The description should summarize the page in 1 or 2 sentences.
- The category should be one general topic.
- Tags should be specific keywords.
- Return between 3 and 8 tags.

Webpage content:
{content}
"""


def _fetch_page(url: str) -> tuple[str, str, str]:
    """Return (page_title, meta_description, readable_text)."""
    try:
        with httpx.Client(
            timeout=settings.AI_TIMEOUT_SECONDS,
            follow_redirects=True,
            headers={"User-Agent": "LinkManagerBot/1.0"},
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            page_title = soup.title.string.strip() if soup.title and soup.title.string else ""
            meta = soup.find("meta", attrs={"name": "description"}) or soup.find(
                "meta", attrs={"property": "og:description"}
            )
            meta_desc = (meta.get("content") or "").strip() if meta else ""

            for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
                tag.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
            return page_title, meta_desc, text[: settings.AI_MAX_CONTENT_CHARS]
    except Exception as exc:  # network, parse, timeout, etc.
        logger.warning("Failed to fetch %s: %s", url, type(exc).__name__)
        return "", "", ""


def _parse_json(raw: str) -> dict:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


def _validate(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("AI response is not a JSON object")
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    category = str(data.get("category", "")).strip() or DEFAULT_CATEGORY
    tags_raw = data.get("tags", [])
    if not isinstance(tags_raw, list):
        tags_raw = []
    tags = [str(t).strip() for t in tags_raw if str(t).strip()][:MAX_TAGS]
    if not title:
        raise ValueError("AI response missing title")
    return {
        "title": title,
        "description": description,
        "category": category,
        "tags": tags,
    }


def _call_ai(content: str) -> dict:
    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a metadata extraction assistant. Respond with valid JSON only, no markdown.",
            },
            {"role": "user", "content": PROMPT_TEMPLATE.format(content=content)},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }

    last_err: Exception | None = None
    for attempt in range(2):  # one retry
        try:
            with httpx.Client(timeout=settings.AI_TIMEOUT_SECONDS) as client:
                resp = client.post(
                    f"{settings.AI_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                resp.raise_for_status()
                message = resp.json()["choices"][0]["message"]["content"]
                return _parse_json(message)
        except Exception as exc:
            last_err = exc
            logger.warning("AI call attempt %d failed: %s", attempt + 1, type(exc).__name__)
    raise RuntimeError(f"AI request failed: {last_err}")


def _fallback(url: str, page_title: str, meta_desc: str) -> dict:
    host = urlparse(url).netloc or url
    return {
        "title": page_title or host,
        "description": meta_desc or "",
        "category": DEFAULT_CATEGORY,
        "tags": [],
    }


def analyze_url(url: str) -> dict:
    """Analyze a URL and return {title, description, category, tags}.

    Never raises: on any failure (no key, fetch error, bad AI output) it
    returns a best-effort metadata fallback instead.
    """
    page_title, meta_desc, content = _fetch_page(url)

    if not settings.AI_API_KEY:
        logger.info("AI_API_KEY not set; using metadata fallback for %s", url)
        return _fallback(url, page_title, meta_desc)

    source = content or page_title or meta_desc
    if not source:
        return _fallback(url, page_title, meta_desc)

    try:
        return _validate(_call_ai(source))
    except Exception as exc:
        logger.warning("AI analysis failed for %s: %s", url, type(exc).__name__)
        return _fallback(url, page_title, meta_desc)
