"""
Scraper notizie GENERALI UMBRE - non sportive
Fonti: Umbria24, TerniInRete
Output: react-app/data/news_generali.json
"""

import gzip
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "news_generali.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}

FEEDS = [
    {"url": "https://www.umbria24.it/feed/", "label": "Umbria24"},
    {"url": "https://terninrete.it/feed/", "label": "TerniInRete"},
]

EXCLUDE_KEYWORDS = [
    "pallavolo", "volley", "calcio", "basket", "tennis", "nuoto",
    "atletica", "ciclismo", "rugby", "sport", "partita", "campionato",
    "serie a", "serie b", "serie c", "serie d",
]

MAX_PER_FEED = 10


def fetch_og_image(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read(60000)
            if response.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            html = raw.decode("utf-8", errors="ignore")
    except Exception:
        return None
    match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not match:
        match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
    return match.group(1) if match else None


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


def fetch_feed(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.read()
    except Exception as e:
        print(f"  ERRORE: {e}")
        return None


def parse_feed(xml_bytes, label):
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    posts = []
    items = root.findall("./channel/item")[:MAX_PER_FEED]
    for item in items:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        desc = (item.findtext("description") or "").strip()
        excerpt = re.sub(r"<[^>]+>", "", desc).strip()[:150]

        text = (title + " " + excerpt).lower()
        if any(k in text for k in EXCLUDE_KEYWORDS):
            continue

        posts.append({
            "title": title,
            "excerpt": excerpt,
            "createdTime": pub_date,
            "image": None,
            "permalink": link,
            "source": label,
        })
    return posts


def main():
    all_posts = []
    seen = set()
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    for feed in FEEDS:
        print(f"Scarico {feed['label']}...", end=" ", flush=True)
        xml_bytes = fetch_feed(feed["url"])
        if not xml_bytes:
            continue
        posts = parse_feed(xml_bytes, feed["label"])
        nuove = 0
        for p in posts:
            if p["permalink"] not in seen and parse_date_safe(p["createdTime"]) > cutoff:
                seen.add(p["permalink"])
                all_posts.append(p)
                nuove += 1
        print(f"{nuove} notizie")

    all_posts.sort(key=lambda p: -parse_date_safe(p["createdTime"]).timestamp())
    all_posts = all_posts[:10]

    print("Recupero immagini...")
    for p in all_posts:
        p["image"] = fetch_og_image(p["permalink"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "posts": all_posts}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvate {len(all_posts)} notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
