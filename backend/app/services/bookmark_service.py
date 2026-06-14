from bs4 import BeautifulSoup


def parse_bookmarks(html: str) -> list[dict]:
    """Parse a Netscape-format bookmarks file (Brave/Chrome/Firefox export).

    Returns a de-duplicated list of {"url", "title"} dicts.
    """
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict] = []
    seen: set[str] = set()

    for anchor in soup.find_all("a"):
        href = anchor.get("href")
        if not href or not href.lower().startswith(("http://", "https://")):
            continue
        if href in seen:
            continue
        seen.add(href)
        results.append(
            {"url": href, "title": anchor.get_text(strip=True) or href}
        )

    return results
