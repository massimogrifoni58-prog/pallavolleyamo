"""
Scraper notizie NAZIONALE - Bing News RSS
=============================================
Scarica le ultime notizie sulla Nazionale italiana di pallavolo
da Bing News (pesca da tutto il web, non solo siti ufficiali).
A differenza di Google News, Bing fornisce link diretti veri al
sito originale (non pagine di reindirizzamento via JavaScript),
quindi possiamo recuperare anche le immagini di anteprima.

Uso:
    python fetch_nazionale.py

Output:
    ../react-app/data/nazionale.json
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
from datetime import datetime, timezone

QUERY = "nazionale pallavolo"
LIMIT = 15

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "nazionale.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch_og_image(url, timeout=8):
    """Visita la pagina dell'articolo e cerca l'immagine 'og:image'
    (quella usata per le anteprime social) nel codice HTML."""
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
    except urllib.error.HTTPError as e:
        print(f"ERRORE HTTP {e.code}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"ERRORE di connessione: {e}")
        sys.exit(1)


def extract_real_url(bing_link):
    """Il link RSS di Bing e' un wrapper (bing.com/news/apiclick.aspx?...
    &url=LINK_VERO&...). Estraiamo il link vero per mostrare la fonte
    corretta (es. corriere.it) invece di sempre 'bing.com'."""
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


def parse_rss(xml_bytes, limit):
    root = ET.fromstring(xml_bytes)
    items = root.findall("./channel/item")[:limit]

    posts = []
    for i, item in enumerate(items):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        link = extract_real_url(link)
        pub_date = (item.findtext("pubDate") or "").strip()
        source = source_from_url(link)

        posts.append({
            "id": str(i + 1),
            "title": title,
            "excerpt": f"Fonte: {source}" if source else "",
            "createdTime": pub_date,
            "image": None,
            "permalink": link,
        })
    return posts


def main():
    print(f"Scarico notizie da Bing News per: '{QUERY}'...")
    xml_bytes = fetch_rss(QUERY)
    posts = parse_rss(xml_bytes, LIMIT)
    print(f"Trovate {len(posts)} notizie.")

    print("Recupero le immagini di anteprima (puo' richiedere qualche secondo)...")
    for p in posts:
        p["image"] = fetch_og_image(p["permalink"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "posts": posts}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Salvate {len(posts)} notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
