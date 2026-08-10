"""AI URL analysis service.

Fetches a page, sends its readable content to an OpenAI-compatible chat
completions endpoint, and returns validated structured metadata. All network
and parsing failures degrade gracefully to a metadata-only fallback so the
rest of the app keeps working even without an API key.
"""

import contextlib
import ipaddress
import json
import logging
import re
import socket
import threading
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from ..config import settings

logger = logging.getLogger("ai_service")

DEFAULT_CATEGORY = "Uncategorized"
MAX_TAGS = 5
MAX_REDIRECTS = 5
_ALLOWED_SCHEMES = {"http", "https"}

# Serializes the DNS-pinning window below so concurrent requests (FastAPI
# runs sync routes in a thread pool) can't clobber each other's patch of the
# process-global socket.getaddrinfo.
_dns_pin_lock = threading.Lock()


class UnsafeURLError(ValueError):
    """Raised when a URL targets a disallowed network destination (SSRF guard)."""


def _is_unsafe_ip(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_unspecified
        or ip.is_reserved
        or ip.is_multicast
    )


def _validate_url(url: str) -> tuple[str, str]:
    """Block SSRF: only allow http(s) URLs that resolve to public addresses.

    Resolves the hostname (rather than string-matching it) so this also
    catches DNS names that point at internal/loopback/metadata addresses.
    Returns (hostname, safe_ip) so the caller can pin the actual connection
    to the exact address that was just checked — see _pinned_resolution.
    """
    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise UnsafeURLError(f"Unsupported URL scheme: {parsed.scheme!r}")
    hostname = parsed.hostname
    if not hostname:
        raise UnsafeURLError("URL has no hostname")

    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise UnsafeURLError(f"Could not resolve host: {hostname}") from exc

    safe_ip = None
    for info in infos:
        ip_str = info[4][0]
        if _is_unsafe_ip(ip_str):
            raise UnsafeURLError(f"URL resolves to a disallowed address: {ip_str}")
        if safe_ip is None:
            safe_ip = ip_str
    if safe_ip is None:
        raise UnsafeURLError(f"Could not resolve host: {hostname}")
    return hostname, safe_ip


@contextlib.contextmanager
def _pinned_resolution(hostname: str, ip: str):
    """Force DNS resolution of `hostname` to the already-validated `ip` for
    the duration of the request.

    Without this, httpx re-resolves the hostname itself when it actually
    connects — a separate DNS lookup after _validate_url's — leaving a
    window for DNS rebinding (the name resolves to a public IP during
    validation, then to an internal one moments later at connect time).
    """
    original_getaddrinfo = socket.getaddrinfo

    def pinned_getaddrinfo(host, *args, **kwargs):
        return original_getaddrinfo(ip if host == hostname else host, *args, **kwargs)

    with _dns_pin_lock:
        socket.getaddrinfo = pinned_getaddrinfo
        try:
            yield
        finally:
            socket.getaddrinfo = original_getaddrinfo


PROMPT_TEMPLATE = """Analyze the following webpage and extract structured metadata.

Return only valid JSON with exactly these fields:
- title: clear, concise page title
- description: 1-2 sentence summary of what the page is about
- category: single broad topic (e.g. "Programming", "Design", "Machine Learning", "Finance")
- tags: array of 3-5 specific, high-signal keywords

Tag rules:
- Each tag is 1-6 words, lowercase
- Prefer specific over generic (e.g. "react hooks" not "javascript")
- Cover different facets: technology, topic, audience, or use-case
- No duplicates or near-duplicates
- Maximum 5 tags

Webpage content:
{content}
"""


def _fetch_page(url: str) -> tuple[str, str, str]:
    """Return (page_title, meta_description, readable_text)."""
    # Raises UnsafeURLError uncaught — surfaced to the caller.
    hostname, ip = _validate_url(url)
    try:
        with httpx.Client(
            timeout=settings.AI_TIMEOUT_SECONDS,
            follow_redirects=False,
            headers={"User-Agent": "LinkManagerBot/1.0"},
        ) as client:
            with _pinned_resolution(hostname, ip):
                resp = client.get(url)
            # Redirects are followed manually, re-validating (and re-pinning)
            # each hop, so a redirect can't be used to smuggle a request to
            # an internal host.
            redirects = 0
            while resp.is_redirect and redirects < MAX_REDIRECTS:
                location = resp.headers.get("location")
                if not location:
                    break
                next_url = str(httpx.URL(url).join(location))
                hostname, ip = _validate_url(next_url)
                url = next_url
                with _pinned_resolution(hostname, ip):
                    resp = client.get(url)
                redirects += 1

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
    except UnsafeURLError:
        raise
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
