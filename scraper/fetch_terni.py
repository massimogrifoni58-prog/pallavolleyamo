"""
Scraper notizie PROVINCIA DI TERNI - Bing News RSS
======================================================
Scarica da Bing News le notizie di pallavolo della provincia di
Terni con query multiple e filtro per notizie locali.

Uso:
    python fetch_terni.py

Output:
    ../react-app/data/terni.json
"""

import gzip
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

# Query multiple per coprire meglio il volley ternano
QUERIES = [
    "pallavolo Terni",
    "volley Terni femminile",
    "pallavolo serie D Terni",
    "pallavolo Narni",
    "pallavolo Orvieto",
    "pallavolo Amelia",
    "Volley Terni 2026",
    "pallavolo Foligno volley",
    "pallavolo Terni under",
    "San Gemini Bosco Volley pallavolo",
    "Narni Sport Academy pallavolo",
    "Amerina Pallavolo",
    "Bosico Terni pallavolo",
    "Pallavolo Arrone",
    "Acquasparta pallavolo",
    "Narni Pallavolo",
    "Colleluna volley",
]

# Parole chiave che indicano notizie locali della provincia di Terni
KEYWORDS_TERNI = [
    "terni", "narni", "orvieto", "amelia", "acquasparta",
    "san gemini", "ternana",
    "terni volley ", "narni sport narni", "tva terni",
    "umbria", "ternano", "ternana",
    "san gemini", "bosco volley", "amerina", "bosico",
    "arrone", "acquasparta", "colleluna",
]   

LIMIT = 20

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "terni.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}

CATEGORY_PRIORITY = [
    "serie a",
    "superlega",
    "serie b",
    "serie c",
    "serie d",
    "1 divisione",
    "prima divisione",
    "2 divisione",
    "seconda divisione",
]


def fetch_og_image(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read(60000)
            if response.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            html = raw.decode("utf-8", errors="ignore")
    except Exception:
        return None

    match = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            html,
            re.IGNORECASE,
        )
    return match.group(1) if match else None


def build_rss_url(query):
    q = urllib.parse.quote(query)
    return f"https://www.bing.com/news/search?q={q}&format=RSS&setlang=it-IT&cc=IT"


def fetch_rss(query):
    url = build_rss_url(query)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        print(f"  ERRORE per '{query}': {e}")
        return None


def extract_real_url(bing_link):
    try:
        parsed = urllib.parse.urlparse(bing_link)
        params = urllib.parse.parse_qs(parsed.query)
        if "url" in params:
            return params["url"][0]
    except Exception:
        pass
    return bing_link


def source_from_url(url):
    try:
        return urllib.parse.urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def category_score(title):
    title_lower = title.lower()
    for i, keyword in enumerate(CATEGORY_PRIORITY):
        if keyword in title_lower:
            return i
    return len(CATEGORY_PRIORITY)


def parse_date_safe(date_str):
    if not date_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)


def is_local(title, excerpt):
    """Verifica se la notizia riguarda davvero la provincia di Terni."""
    text = (title + " " + excerpt).lower()
    return any(k in text for k in KEYWORDS_TERNI)


def parse_rss(xml_bytes, limit):
    root = ET.fromstring(xml_bytes)
    items = root.findall("./channel/item")[:limit]

    posts = []
    for item in items:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        link = extract_real_url(link)
        pub_date = (item.findtext("pubDate") or "").strip()
        source = source_from_url(link)

        posts.append({
            "title": title,
            "excerpt": f"Fonte: {source}" if source else "",
            "createdTime": pub_date,
            "image": None,
            "permalink": link,
        })
    return posts


def main():
    all_posts = []
    seen_links = set()

    for query in QUERIES:
        print(f"Scarico: '{query}'...", end=" ", flush=True)
        xml_bytes = fetch_rss(query)
        if not xml_bytes:
            continue
        posts = parse_rss(xml_bytes, LIMIT)
        nuove = 0
        for p in posts:
            if p["permalink"] not in seen_links and is_local(p["title"], p["excerpt"]):
                seen_links.add(p["permalink"])
                all_posts.append(p)
                nuove += 1
        print(f"{nuove} notizie locali")

    print(f"\nTotale: {len(all_posts)} notizie locali trovate")

    all_posts.sort(key=lambda p: (
        category_score(p["title"]),
        -parse_date_safe(p["createdTime"]).timestamp()
    ))

    # Limita a 30 notizie totali
    all_posts = all_posts[:50]

    for i, p in enumerate(all_posts):
        p["id"] = str(i + 1)

    print("Recupero immagini di anteprima...")
    for p in all_posts:
        p["image"] = fetch_og_image(p["permalink"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "posts": all_posts
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvate {len(all_posts)} notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
