"""
Scraper notizie REGIONALI - FIPAV Umbria + Bing News (multi-ricerca)
========================================================================
Scarica le ultime notizie regionali da due fonti:
1. Sito FIPAV Umbria (WordPress) - fonte ufficiale
2. Bing News, con piu' ricerche mirate (Umbria, Perugia, Terni,
   Foligno, Assisi, Gubbio, Spoleto, FIPAV Umbria) per coprire
   tutte le notizie di pallavolo riferite alla regione, non solo
   quelle del sito ufficiale.

Le unisce, le ordina per data ed elimina i duplicati, poi le salva
in JSON per la sezione "Campionati regionali" del sito PallaVolleyAmo.

Uso:
    python fetch_regionali.py

Output:
    ../react-app/data/regionali.json
"""

import html as html_module
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

# --- Fonte 1: FIPAV Umbria (WordPress REST API) ---
FIPAV_URL = "https://fipavumbria.it/wp-json/wp/v2/posts"
FIPAV_LIMIT = 15

# --- Fonte 2: Bing News RSS (piu' ricerche per coprire tutta la regione) ---
NEWS_QUERIES = [
    "pallavolo Umbria",
    "volley Umbria",
    "FIPAV Umbria",
    "pallavolo Perugia",
    "pallavolo Terni",
    "volley Foligno",
    "volley Assisi",
    "volley Gubbio",
    "volley Spoleto",
    "volley Narni",
    "volley Orvieto",
]
NEWS_LIMIT_PER_QUERY = 8
NEWS_TOTAL_LIMIT = 40

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "regionali.json"

HEADERS = {"User-Agent": "Mozilla/5.0"}


import gzip


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


def strip_html(raw_html):
    text = re.sub(r"<[^>]+>", "", raw_html or "")
    text = html_module.unescape(text)
    return text.strip()


# --- Fonte 1: FIPAV Umbria ---

def fetch_fipav():
    url = f"{FIPAV_URL}?per_page={FIPAV_LIMIT}&_embed"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read())
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        print(f"ATTENZIONE: errore scaricando da FIPAV Umbria: {e}")
        return []


def get_fipav_image(raw_post):
    try:
        media = raw_post.get("_embedded", {}).get("wp:featuredmedia", [])
        if media:
            return media[0].get("source_url")
    except Exception:
        pass
    return None


def normalize_fipav(raw_post):
    return {
        "id": f"fipav-{raw_post.get('id')}",
        "title": strip_html(raw_post.get("title", {}).get("rendered", "")),
        "excerpt": strip_html(raw_post.get("excerpt", {}).get("rendered", ""))[:280],
        "createdTime": raw_post.get("date"),
        "image": get_fipav_image(raw_post),
        "permalink": raw_post.get("link"),
    }


# --- Fonte 2: Bing News (link diretti veri, a differenza di Google News) ---

def build_rss_url(query):
    q = urllib.parse.quote(query)
    return f"https://www.bing.com/news/search?q={q}&format=RSS&setlang=it-IT&cc=IT"


def extract_real_url(bing_link):
    """Il link RSS di Bing e' un wrapper; estraiamo il link vero."""
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


def fetch_news(query):
    url = build_rss_url(query)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        print(f"ATTENZIONE: errore scaricando da Bing News: {e}")
        return None


def normalize_news(xml_bytes, limit):
    if xml_bytes is None:
        return []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    items = root.findall("./channel/item")[:limit]

    posts = []
    for i, item in enumerate(items):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        link = extract_real_url(link)
        pub_date = (item.findtext("pubDate") or "").strip()
        source = source_from_url(link)

        posts.append({
            "id": f"news-{i}",
            "title": title,
            "excerpt": f"Fonte: {source}" if source else "",
            "createdTime": pub_date,
            "image": None,
            "permalink": link,
        })
    return posts


def parse_date_safe(date_str):
    from email.utils import parsedate_to_datetime
    from datetime import datetime, timezone

    if not date_str:
        return datetime.min.replace(tzinfo=timezone.utc)

    dt = None
    try:
        dt = parsedate_to_datetime(date_str)
    except Exception:
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt


def main():
    print("Scarico le notizie regionali...")

    print("- Fonte 1: FIPAV Umbria")
    fipav_raw = fetch_fipav()
    fipav_posts = [normalize_fipav(p) for p in fipav_raw]
    print(f"  Trovate {len(fipav_posts)} notizie.")

    print(f"- Fonte 2: Bing News ({len(NEWS_QUERIES)} ricerche)")
    news_posts = []
    seen_links_news = set()
    for query in NEWS_QUERIES:
        print(f"  ...'{query}'")
        news_xml = fetch_news(query)
        for p in normalize_news(news_xml, NEWS_LIMIT_PER_QUERY):
            if p["permalink"] not in seen_links_news:
                seen_links_news.add(p["permalink"])
                news_posts.append(p)
    news_posts = news_posts[:NEWS_TOTAL_LIMIT]
    print(f"  Trovate {len(news_posts)} notizie uniche totali.")

    print("  Recupero le immagini di anteprima per le notizie dal web...")
    for p in news_posts:
        p["image"] = fetch_og_image(p["permalink"])

    all_posts = fipav_posts + news_posts

    # Eliminiamo eventuali link duplicati
    seen = set()
    unique_posts = []
    for p in all_posts:
        link = p.get("permalink")
        if link and link in seen:
            continue
        if link:
            seen.add(link)
        unique_posts.append(p)

    # Ordiniamo dal piu' recente al meno recente
    unique_posts.sort(key=lambda p: parse_date_safe(p.get("createdTime")), reverse=True)

    from datetime import datetime, timezone
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "posts": unique_posts}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvate {len(unique_posts)} notizie totali in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
